#!/usr/bin/env python3
"""strip-license-badges.py — git clean filter: 剥离 src/license-badges.ts 的私人许可证勋章。

本地工作区保留勋章(部署用), 但 commit 进 git/GitHub 的版本自动剥离为空数组,
App.tsx 的 import 仍有效 → GitHub 公开版编译通过且无私人勋章。
用法: git config filter.license-strip.clean 'python3 scripts/strip-license-badges.py clean'
       git config filter.license-strip.smudge 'cat'
"""
import re
import sys

# 匹配整个数组定义块(含前面的注释行), 替换为空数组
MARKER_RE = re.compile(
    r'// 本地部署专属.*?\nexport const EXTRA_LICENSE_BADGES: \{ name: string; display_name: string \}\[\] = \[.*?\]\n',
    re.DOTALL,
)
REPLACEMENT = (
    '// GitHub 公开版: 私人许可证勋章已剥离, 仅展示主控 API 返回的 license_badge。\n'
    'export const EXTRA_LICENSE_BADGES: { name: string; display_name: string }[] = []\n'
)


def strip(src: str) -> str:
    """把 license-badges.ts 的数组剥离为空数组。"""
    out = MARKER_RE.sub(REPLACEMENT, src, count=1)
    if out == src and 'EXTRA_LICENSE_BADGES' not in src:
        return src  # 文件不含勋章(如已被剥离), 原样返回
    return out


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
