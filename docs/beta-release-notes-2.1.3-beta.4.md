# WordPress Publisher 2.1.3-beta.4

This beta fixes two regressions in the path from the Obsidian ribbon to the publishing dialog.

## Ribbon launch

- Clicking the WordPress ribbon icon now produces immediate preparation feedback while authentication and site metadata load.
- A missing active note and synchronous client setup errors are shown directly instead of failing silently.

## Authentication

- REST Basic authentication now encodes Unicode usernames correctly.
- Spaces copied with a WordPress Application Password are removed before authentication.
- Passwords used by other REST extensions keep their original spaces.
- WordPress error messages such as disabled Application Passwords or insufficient REST permissions are preserved.
- The login dialog identifies the Application Password field, explains that it is different from the normal website password, and disables repeat submission while connecting.

Core WordPress REST authentication requires an Application Password created under **Users → Profile → Application Passwords**. A normal interactive website password is still used by XML-RPC or by a separately configured authentication extension.
