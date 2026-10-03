#!/usr/bin/env python3
"""Start a local server for the English edition of PortMasters.

Serves the PortMasters_Web_Edition folder on http://localhost:8020, opens the
English entry page in your default browser, and also lets other devices on
the same network play at this computer's address, which the banner prints.
Standard library only, no dependencies. Press Ctrl+C to stop the server.
"""

import functools
import http.server
import os
import socket
import sys
import threading
import webbrowser

PORT = 8020
ENTRY = "PortMasters_v1.4.0.html"
ROOT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "PortMasters_Web_Edition"
)


class GameHandler(http.server.SimpleHTTPRequestHandler):
    """Serves the game folder and sends the bare root path to the entry page."""

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/" + ENTRY)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, format, *args):
        # The banner already tells the user what is happening; keep the
        # console quiet.
        pass


def fail(message):
    print("  " + message, flush=True)
    return 1


def lan_address():
    """The address other devices on the network can reach, or None.

    A UDP socket pointed at a public address reports which interface would
    carry the traffic. No packets are actually sent."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("8.8.8.8", 80))
            return probe.getsockname()[0]
    except OSError:
        return None


def main():
    # Consoles that cannot encode the banner's emoji should degrade instead
    # of crashing the launcher.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            return fail("Not a port number: " + sys.argv[1])

    if not os.path.isfile(os.path.join(ROOT, ENTRY)):
        return fail(
            "Could not find PortMasters_Web_Edition next to this script. "
            "Keep the project folders together and try again."
        )

    try:
        server = http.server.ThreadingHTTPServer(
            ("0.0.0.0", port), functools.partial(GameHandler, directory=ROOT)
        )
    except OSError:
        return fail(
            "Port {0} is already in use. Close the other program, or run: "
            "python {1} {2}".format(port, os.path.basename(__file__), port + 1)
        )

    url = "http://localhost:{}/{}".format(port, ENTRY)
    print()
    print("  PortMasters is ready!")
    print("  Serving the English edition on this computer at " + url)
    lan = lan_address()
    if lan:
        print(
            "  On the same network, other devices can play at "
            "http://{}:{}/{}".format(lan, port, ENTRY)
        )
    print("  Press Ctrl+C to stop the server.")
    print(flush=True)

    def open_browser():
        if not webbrowser.open(url):
            print("  Open the link above in your browser to play.", flush=True)

    threading.Timer(0.4, open_browser).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped. Fair winds!", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
