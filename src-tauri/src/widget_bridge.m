#import <Foundation/Foundation.h>

const char *krmf_widget_snapshot_path(void) {
    @autoreleasepool {
        NSURL *container = [[NSFileManager defaultManager]
            containerURLForSecurityApplicationGroupIdentifier:
                @"group.56PQ4C62FB.com.krmf.widgets"];

        if (container == nil) {
            return NULL;
        }

        NSURL *file = [container URLByAppendingPathComponent:@"snapshot.json"];
        return strdup(file.path.UTF8String);
    }
}
