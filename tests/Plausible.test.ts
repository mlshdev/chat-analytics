/**
 * @jest-environment jsdom
 */
import { plausible } from "@assets/Plausible";

const testPageview = ({ location, expectedPath }: { location: string; expectedPath: string }) => {
    const fetchMock = (global.fetch = jest.fn(() => Promise.resolve()) as jest.Mock);

    // Parse the location to create a mock location object
    // Handle blob: URLs specially since they don't parse the same way
    let mockLocation: Partial<Location>;
    if (location.startsWith("blob:")) {
        const innerUrl = new URL(location.replace("blob:", ""));
        mockLocation = {
            hostname: innerUrl.hostname,
            pathname: innerUrl.pathname,
            search: innerUrl.search,
            href: location,
        };
    } else if (location.startsWith("file:")) {
        mockLocation = {
            hostname: "",
            pathname: new URL(location).pathname,
            search: "",
            href: location,
        };
    } else {
        const url = new URL(location);
        mockLocation = {
            hostname: url.hostname,
            pathname: url.pathname,
            search: url.search,
            href: location,
        };
    }

    // Use a getter-based approach for better compatibility
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = mockLocation as Location;

    try {
        plausible("pageview");

        const fetchBody = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(fetchBody.url).toBe(`https://chatanalytics.app${expectedPath}`);
    } finally {
        // Restore location using descriptor if available
        if (locationDescriptor) {
            Object.defineProperty(window, "location", locationDescriptor);
        }
    }
};

it.each([
    { expectedPath: "", location: "https://chatanalytics.app" },
    { expectedPath: "", location: "https://chatanalytics.app/" },
    { expectedPath: "/demo", location: "https://chatanalytics.app/demo" },
    { expectedPath: "/report", location: "https://chatanalytics.app/1bce0f51-c722-4a6b-9957-5588a601366c" },
    { expectedPath: "/report", location: "blob:https://chatanalytics.app/1bce0f51-c722-4a6b-9957-5588a601366c" },
    { expectedPath: "/report", location: "http://someuser.github.io" },
    { expectedPath: "/report", location: "http://someuser.github.io/Report - Chat Analytics.html" },
    { expectedPath: "/report", location: "http://someuser.github.io/somereport" },
    { expectedPath: "/report", location: "http://someuser.github.io/somereport/Report - Chat Analytics.html" },
    { expectedPath: "/report", location: "file:///C:/Users/user/Downloads/Report - Chat Analytics.html" },
    { expectedPath: "/report", location: "http://123.123.123.123/index.html" },
    { expectedPath: "/report", location: "http://127.0.0.1:8080" },
    { expectedPath: "/report", location: "http://127.0.0.1:8080/Report - Chat Analytics.html" },
])("should resolve in path '$expectedPath': $location", testPageview);

it.each([
    {
        expectedPath: "?utm_source=report",
        location: "https://chatanalytics.app/?utm_source=report",
    },
    {
        expectedPath: "/demo?utm_source=facebook",
        location: "https://chatanalytics.app/demo/?utm_source=facebook",
    },
    {
        expectedPath: "/report?utm_source=twitter",
        location: "http://someuser.github.io/somereport/?utm_source=twitter",
    },
])("should preserve search params: $location", testPageview);
