import Foundation
import WidgetKit

@main struct Bridge {
    static func main() {
        do {
            let data = FileHandle.standardInput.readDataToEndOfFile()
            guard data.count <= 16 * 1024 * 1024 else { throw NSError(domain: "KRMF", code: 1) }
            _ = try JSONDecoder().decode(Snapshot.self, from: data)
            guard let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: widgetGroup) else {
                throw NSError(domain: "KRMF", code: 2, userInfo: [NSLocalizedDescriptionKey: "Widget shared container is unavailable"])
            }
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let destination = directory.appendingPathComponent("snapshot.json")
            if (try? Data(contentsOf: destination)) != data {
                try data.write(to: destination, options: .atomic)
                WidgetCenter.shared.reloadAllTimelines()
            }
        } catch {
            FileHandle.standardError.write(Data("KRMF widget sync: \(error.localizedDescription)\n".utf8))
            exit(1)
        }
    }
}
