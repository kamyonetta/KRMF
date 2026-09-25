import SwiftUI
import WidgetKit
import CoreText

struct Entry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot
    var ready = true
}
struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry { Entry(date: Date(), snapshot: .empty) }
    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        let data = Snapshot.load()
        completion(Entry(date: Date(), snapshot: data ?? .empty, ready: data != nil))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        let data = Snapshot.load()
        let snapshot = data ?? .empty
        let now = Date()
        // Include midnight rollovers even while the main application is closed.
        let entries = [Entry(date: now, snapshot: snapshot, ready: data != nil)] + (1...7).map {
            Entry(date: snapshot.calendar.date(byAdding: .day, value: $0, to: snapshot.calendar.startOfDay(for: now))!, snapshot: snapshot, ready: data != nil)
        }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(3600))))
    }
}
struct Palette {
    let light: Bool
    var ink: Color { light ? Color(red: 0.20, green: 0.17, blue: 0.13) : Color(white: 0.95) }
    var muted: Color { ink.opacity(0.62) }
    var panel: Color { light ? Color(red: 0.96, green: 0.90, blue: 0.76) : Color(white: 0.10) }
    var edge: Color { light ? Color(red: 0.52, green: 0.40, blue: 0.24) : Color(white: 0.38) }
    var shine: Color { light ? Color(red: 1, green: 0.96, blue: 0.83) : Color(white: 0.57) }
}
func pixel(_ size: CGFloat) -> Font { .custom("PixelifySans-Regular", size: size) }
func eventColor(_ name: String) -> Color {
    switch name {
    case "red": return Color(red: 1, green: 0.41, blue: 0.43)
    case "purple": return Color(red: 0.76, green: 0.54, blue: 1)
    case "green": return Color(red: 0.46, green: 0.86, blue: 0.58)
    case "yellow": return Color(red: 1, green: 0.89, blue: 0.46)
    default: return Color(red: 0.44, green: 0.71, blue: 1)
    }
}
struct PixelFrame: ViewModifier {
    let p: Palette
    func body(content: Content) -> some View {
        content.padding(8).background(p.panel.opacity(0.94))
            .overlay(Rectangle().strokeBorder(p.edge, lineWidth: 2))
            .overlay(alignment: .top) { Rectangle().fill(p.shine).frame(height: 1).padding(.horizontal, 2) }
            .overlay(alignment: .bottom) { Rectangle().fill(Color.black.opacity(0.55)).frame(height: 2) }
    }
}
struct Backdrop: View {
    let p: Palette
    var body: some View {
        GeometryReader { geo in
            Image("classroom-indie", bundle: .main).resizable().scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height).clipped()
                .overlay(p.panel.opacity(p.light ? 0.68 : 0.81))
        }
    }
}
struct Heading: View {
    let title: String
    let entry: Entry
    let p: Palette
    var body: some View {
        HStack(alignment: .center) {
            Image("krmf-logo", bundle: .main).resizable().interpolation(.none).scaledToFit().frame(width: 79, height: 36)
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 1) {
                Text(title).font(pixel(19))
                Text(entry.date, format: .dateTime.weekday(.abbreviated).month(.abbreviated).day()).font(pixel(12)).foregroundStyle(p.muted)
            }
        }.foregroundStyle(p.ink)
    }
}
struct ListItem: Identifiable {
    let id: String
    let title: String
    var checked: Bool? = nil
    var color: String? = nil
    var day = ""
}
struct ItemSection: View {
    let title: String
    let items: [ListItem]
    let limit: Int
    let p: Palette
    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(pixel(14)).foregroundStyle(p.ink)
            Rectangle().fill(p.edge.opacity(0.7)).frame(height: 1)
            if items.isEmpty { Text("All clear").font(pixel(12)).foregroundStyle(p.muted) }
            ForEach(Array(items.prefix(limit))) { item in
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    if let checked = item.checked {
                        Text(checked ? "▣" : "□").font(.system(size: 12, weight: .bold, design: .monospaced))
                    } else {
                        Rectangle().fill(eventColor(item.color ?? "blue")).frame(width: 6, height: 6)
                    }
                    Text(item.title.isEmpty ? "Untitled" : item.title)
                        .strikethrough(item.checked == true).opacity(item.checked == true ? 0.55 : 1)
                        .font(pixel(12)).lineLimit(1)
                    if !item.day.isEmpty { Spacer(minLength: 0); Text(item.day).font(pixel(9)).foregroundStyle(p.muted) }
                }.foregroundStyle(p.ink)
            }
            Spacer(minLength: 0)
            if items.count > limit { Text("+\(items.count - limit) more in KRMF").font(pixel(10)).foregroundStyle(p.muted) }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).modifier(PixelFrame(p: p))
    }
}
struct OverviewView: View {
    let entry: Entry
    @Environment(\.widgetFamily) private var family
    var p: Palette { Palette(light: entry.snapshot.theme == "light") }
    var today: DayData { entry.snapshot.days[entry.snapshot.key(entry.date)] ?? DayData() }
    var weekTasks: [ListItem] {
        let dates = entry.snapshot.weekDates(entry.date)
        let daily = dates.flatMap { date in
            (entry.snapshot.days[entry.snapshot.key(date)]?.todos ?? []).map {
                ListItem(id: $0.id, title: $0.title, checked: $0.checked, day: weekday(date))
            }
        }
        let extra = (entry.snapshot.weeks[entry.snapshot.key(dates[0])] ?? []).map {
            ListItem(id: $0.id, title: $0.title, checked: $0.checked)
        }
        return (daily + extra).sorted { ($0.checked == true ? 1 : 0) < ($1.checked == true ? 1 : 0) }
    }
    var weekEvents: [ListItem] {
        entry.snapshot.weekDates(entry.date).flatMap { date in
            (entry.snapshot.days[entry.snapshot.key(date)]?.important ?? []).map {
                ListItem(id: entry.snapshot.key(date) + $0.id, title: $0.title, color: $0.color, day: weekday(date))
            }
        }
    }
    func weekday(_ date: Date) -> String {
        ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][entry.snapshot.calendar.component(.weekday, from: date) - 1]
    }
    var body: some View {
        VStack(spacing: 8) {
            Heading(title: "Today & this week", entry: entry, p: p)
            if !entry.ready { Text("Open KRMF once to sync your planner").font(pixel(14)).foregroundStyle(p.ink) }
            let limit = family == .systemExtraLarge ? 5 : 4
            HStack(spacing: 8) {
                ItemSection(title: "TODAY · TO DO", items: today.todos.sorted { !$0.checked && $1.checked }.map { ListItem(id: $0.id, title: $0.title, checked: $0.checked) }, limit: limit, p: p)
                ItemSection(title: "TODAY · EVENTS", items: today.important.map { ListItem(id: $0.id, title: $0.title, color: $0.color) }, limit: limit, p: p)
            }
            HStack(spacing: 8) {
                ItemSection(title: "WEEK · TO DO", items: weekTasks, limit: limit, p: p)
                ItemSection(title: "WEEK · EVENTS", items: weekEvents, limit: limit, p: p)
            }
        }.padding(12).containerBackground(for: .widget) { Backdrop(p: p) }
    }
}
struct PlacedActivity: Identifiable {
    let activity: Activity
    var start: Int
    var end: Int
    var lane = 0
    var lanes = 1
    var id: String { activity.id }
}
func placeActivities(_ activities: [Activity], start: Int, end: Int) -> [PlacedActivity] {
    let visible: [Activity] = activities.filter { $0.start < end && $0.end > start }
    var rows: [PlacedActivity] = visible.map { item in
        PlacedActivity(activity: item, start: Swift.max(start, item.start), end: Swift.min(end, item.end))
    }
    rows.sort { a, b in a.start == b.start ? a.end > b.end : a.start < b.start }
    var cluster: [Int] = [], ends: [Int] = [], clusterEnd = -1
    func finish() { for i in cluster { rows[i].lanes = ends.count }; cluster = []; ends = [] }
    for i in rows.indices {
        if rows[i].start >= clusterEnd { finish(); clusterEnd = -1 }
        let lane = ends.firstIndex(where: { $0 <= rows[i].start }) ?? ends.count
        if lane == ends.count { ends.append(rows[i].end) } else { ends[lane] = rows[i].end }
        rows[i].lane = lane
        cluster.append(i); clusterEnd = max(clusterEnd, rows[i].end)
    }
    finish(); return rows
}
func hourText(_ minute: Int) -> String {
    let h = (minute / 60) % 24
    return "\(h % 12 == 0 ? 12 : h % 12)\(h < 12 ? "a" : "p")"
}
struct ScheduleColumn: View {
    let activities: [Activity]
    let start: Int
    let end: Int
    let p: Palette
    var body: some View {
        GeometryReader { geo in
            let height = geo.size.height
            let scale = height / CGFloat(end - start)
            let label: CGFloat = 27
            ZStack(alignment: .topLeading) {
                ForEach(Array(stride(from: start, to: end, by: 60)), id: \.self) { minute in
                    HStack(alignment: .top, spacing: 3) {
                        Text(hourText(minute)).font(pixel(10)).foregroundStyle(p.muted).frame(width: label - 3, alignment: .trailing)
                        Rectangle().fill(p.edge.opacity(0.5)).frame(height: 1)
                    }.offset(y: CGFloat(minute - start) * scale)
                }
                ForEach(placeActivities(activities, start: start, end: end)) { row in
                    let width = max(1, (geo.size.width - label) / CGFloat(row.lanes))
                    let blockHeight = max(1, CGFloat(row.end - row.start) * scale - 2)
                    Text(row.activity.title).font(pixel(11)).foregroundStyle(p.ink)
                        .lineLimit(blockHeight > 32 ? 2 : 1)
                        .padding(.horizontal, 4)
                        .frame(width: max(1, width - 2), height: blockHeight, alignment: .leading)
                        .background(p.light ? Color(red: 0.86, green: 0.78, blue: 0.61) : Color(white: 0.22))
                        .overlay(Rectangle().strokeBorder(p.edge, lineWidth: 1))
                        .clipped()
                        .offset(x: label + CGFloat(row.lane) * width, y: CGFloat(row.start - start) * scale + 1)
                        .accessibilityLabel("\(row.activity.title), \(row.activity.start / 60):\(String(format: "%02d", row.activity.start % 60)) to \(row.activity.end / 60):\(String(format: "%02d", row.activity.end % 60))")
                }
            }
        }.modifier(PixelFrame(p: p))
    }
}
struct ScheduleView: View {
    let entry: Entry
    var p: Palette { Palette(light: entry.snapshot.theme == "light") }
    var activities: [Activity] { entry.snapshot.days[entry.snapshot.key(entry.date)]?.schedule ?? [] }
    var body: some View {
        VStack(spacing: 8) {
            Heading(title: "Today's schedule", entry: entry, p: p)
            if !entry.ready { Text("Open KRMF once to sync your planner").font(pixel(14)).foregroundStyle(p.ink) }
            HStack(spacing: 8) {
                ScheduleColumn(activities: activities, start: 480, end: 900, p: p)
                ScheduleColumn(activities: activities, start: 900, end: 1380, p: p)
            }
            Text(activities.isEmpty ? "A little room to breathe" : "8 AM – 10 PM · Open KRMF to edit").font(pixel(11)).foregroundStyle(p.muted)
        }.padding(12).containerBackground(for: .widget) { Backdrop(p: p) }
    }
}
struct OverviewWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "KRMFOverview", provider: Provider()) { OverviewView(entry: $0) }
            .configurationDisplayName("KRMF · Today & this week")
            .description("Your daily and weekly to-dos and important events, together on your desktop.")
            .supportedFamilies([.systemLarge, .systemExtraLarge]).contentMarginsDisabled()
    }
}
struct ScheduleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "KRMFSchedule", provider: Provider()) { ScheduleView(entry: $0) }
            .configurationDisplayName("KRMF · Today's schedule")
            .description("Your hourly planner from 8 AM through 10 PM.")
            .supportedFamilies([.systemLarge, .systemExtraLarge]).contentMarginsDisabled()
    }
}
@main struct KRMFWidgets: WidgetBundle {
    var body: some Widget {
        OverviewWidget()
        ScheduleWidget()
    }
}
