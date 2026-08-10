#!/usr/bin/env python3
"""strip-license-badges.py — git clean filter: 从 src/App.tsx 剥离私有许可证勋章。

本地工作区保留勋章(部署用), 但 commit 进 git/GitHub 的版本自动无勋章。
用法: git config filter.license-strip.clean 'python3 scripts/strip-license-badges.py clean'
       git config filter.license-strip.smudge 'python3 scripts/strip-license-badges.py smudge'
"""
import re
import sys

MARKER = 'const EXTRA_LICENSE_BADGES = ['

def strip(src: str) -> str:
    """删除 EXTRA_LICENSE_BADGES 数组定义(含前面注释), 替换为占位注释。"""
    idx = src.find(MARKER)
    if idx == -1:
        return src  # 已无勋章, 原样返回
    # 找数组结尾: 从 idx 开始匹配到 ']' 后
    end = src.find(']\n', idx)
    if end == -1:
        return src
    end += 2
    # 同时删掉前面的专属注释行(含"注意:此数组为本地部署专属")
    start = src.rfind('// 主控端仅支持单个许可证', idx - 400, idx)
    if start == -1:
        start = idx
    replacement = '// 许可证铭牌：仅展示主控 API 返回的 license_badge。\n'
    return src[:start] + replacement + src[end:]

def restore(src: str) -> str:
    """smudge 不需要(本地文件本身有勋章, checkout 时保持原样)。"""
    return src

def main() -> None:
    data = sys.stdin.read()
    mode = sys.argv[1] if len(sys.argv) > 1 else 'clean'
    out = strip(data) if mode == 'clean' else restore(data)
    sys.stdout.write(out)

if __name__ == '__main__':
    main()
