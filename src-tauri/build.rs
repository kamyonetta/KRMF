use std::process::Command;

fn main() {
    #[cfg(target_os = "macos")]
    {
        cc::Build::new()
            .file("src/widget_bridge.m")
            .flag("-fobjc-arc")
            .compile("krmf_widget_bridge");

        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=WidgetKit");

        let out_dir = std::env::var("OUT_DIR").unwrap();
        let swift_object = format!("{}/widget_reload.o", out_dir);

        let status = Command::new("xcrun")
            .args([
                "swiftc",
                "-parse-as-library",
                "-c",
                "src/widget_reload.swift",
                "-o",
                &swift_object,
            ])
            .status()
            .expect("failed to run swiftc");

        if !status.success() {
            panic!("failed to compile widget_reload.swift");
        }

        println!("cargo:rustc-link-arg={}", swift_object);
        println!("cargo:rerun-if-changed=src/widget_bridge.m");
        println!("cargo:rerun-if-changed=src/widget_reload.swift");
    }

    tauri_build::build()
}
