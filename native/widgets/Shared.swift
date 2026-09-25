import Foundation

let widgetGroup = "group.56PQ4C62FB.com.krmf.widgets"
struct WidgetTask: Codable, Identifiable { let id: String; let title: String; let checked: Bool; let date: String }
struct ImportantItem: Codable, Identifiable { let id: String; let title: String; let color: String }
struct Activity: Codable, Identifiable { let id: String; let title: String; let start: Int; let end: Int }
struct DayData: Codable {
    var todos: [WidgetTask] = []
    var important: [ImportantItem] = []
    var schedule: [Activity] = []
}
struct Snapshot: Codable {
    let version: Int
    let theme: String
    let timezone: String
    let days: [String: DayData]
    let weeks: [String: [WidgetTask]]
    static let empty = Snapshot(version: 1, theme: "dark", timezone: TimeZone.current.identifier, days: [:], weeks: [:])
    var calendar: Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: timezone) ?? .current
        c.firstWeekday = 2
        return c
    }
    func key(_ date: Date) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
    func weekDates(_ date: Date) -> [Date] {
        let c = calendar
        let offset = (c.component(.weekday, from: date) + 5) % 7
        let start = c.date(byAdding: .day, value: -offset, to: c.startOfDay(for: date))!
        return (0..<7).map { c.date(byAdding: .day, value: $0, to: start)! }
    }
    static func load() -> Snapshot? {
        guard let url = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: widgetGroup)?.appendingPathComponent("snapshot.json"),
              let data = try? Data(contentsOf: url), let value = try? JSONDecoder().decode(Snapshot.self, from: data), value.version == 1 else { return nil }
        return value
    }
}
