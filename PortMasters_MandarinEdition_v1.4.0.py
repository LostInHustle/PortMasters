#!/usr/bin/env python3
"""启动《港口大师》简体中文版的本地服务器。

在 http://localhost:8020 上运行 PortMasters_Web_Edition 文件夹，并用默认浏览器
打开中文版页面；同一网络中的其他设备也可访问，地址会打印在启动横幅中。
仅使用 Python 标准库，无需安装任何依赖。按 Ctrl+C 停止服务器。
"""

import functools
import http.server
import os
import socket
import sys
import threading
import webbrowser

PORT = 8020
ENTRY = "PortMasters_MandarinEdition_v1.4.0.html"
ROOT = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "PortMasters_Web_Edition"
)


class GameHandler(http.server.SimpleHTTPRequestHandler):
    """提供游戏目录，并将根路径重定向到入口页面。"""

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/" + ENTRY)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, format, *args):
        # 启动横幅已说明运行状态，保持控制台整洁。
        pass


def fail(message):
    print("  " + message, flush=True)
    return 1


def lan_address():
    """本机在局域网中的访问地址；无法确定时返回 None。

    向一个公网地址连接 UDP 套接字即可得知出口网卡，不会真正发送数据包。"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as probe:
            probe.connect(("8.8.8.8", 80))
            return probe.getsockname()[0]
    except OSError:
        return None


def main():
    # 控制台无法显示部分字符时降级处理，而不是让启动脚本崩溃。
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")

    port = PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            return fail("不是有效的端口号：" + sys.argv[1])

    if not os.path.isfile(os.path.join(ROOT, ENTRY)):
        return fail(
            "未能在此脚本旁找到 PortMasters_Web_Edition 文件夹，"
            "请保持项目目录完整后重试。"
        )

    try:
        server = http.server.ThreadingHTTPServer(
            ("0.0.0.0", port), functools.partial(GameHandler, directory=ROOT)
        )
    except OSError:
        return fail(
            "端口 {0} 已被占用。请关闭占用该端口的程序，或运行："
            "python {1} {2}".format(port, os.path.basename(__file__), port + 1)
        )

    url = "http://localhost:{}/{}".format(port, ENTRY)
    print()
    print("  港口大师已就绪！")
    print("  简体中文版正在运行：" + url)
    lan = lan_address()
    if lan:
        print("  同一网络的其他设备可访问：http://{}:{}/{}".format(lan, port, ENTRY))
    print("  按 Ctrl+C 停止服务器。")
    print(flush=True)

    def open_browser():
        if not webbrowser.open(url):
            print("  请在浏览器中打开上面的链接开始游戏。", flush=True)

    threading.Timer(0.4, open_browser).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  服务器已停止，一帆风顺！", flush=True)
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
