import WidgetKit

@_cdecl("krmf_reload_widgets")
public func krmf_reload_widgets() {
    WidgetCenter.shared.reloadAllTimelines()
}
