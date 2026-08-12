#!/usr/bin/env bash
# mmwx-probe 部署脚本(CF Workers)
# 用法:
#   LOAD_KV_ID=<kv-namespace-id> ./scripts/deploy.sh
# 或先创建 KV:
#   npx wrangler kv namespace create LOAD_KV   # 输出里有 id
# 首次部署前必做: 创建 KV namespace 并把 id 填入 LOAD_KV_ID(或 .env.kv)
set -euo pipefail
cd "$(dirname "$0")/.."

# 1. 解析 LOAD_KV_ID: 环境变量 > .env.kv
if [ -z "${LOAD_KV_ID:-}" ] && [ -f .env.kv ]; then
  LOAD_KV_ID=$(grep -E '^LOAD_KV_ID=' .env.kv | head -1 | cut -d= -f2-)
fi
if [ -z "${LOAD_KV_ID:-}" ]; then
  echo "❌ 缺少 LOAD_KV_ID(负载历史 KV namespace)" >&2
  echo "   创建: npx wrangler kv namespace create LOAD_KV" >&2
  echo "   然后: export LOAD_KV_ID=<输出的 id> 或写入 .env.kv(不提交)" >&2
  exit 1
fi

# 2. 生成带 KV 绑定的临时配置(模板占位符,避免仓库锁死他人部署)
#    注意: 必须生成在项目根目录, wrangler 按配置文件所在目录解析相对路径
sed "s|__LOAD_KV_ID__|${LOAD_KV_ID}|g" wrangler.jsonc > .wrangler-deploy.jsonc
trap 'rm -f .wrangler-deploy.jsonc' EXIT

# 3. 构建 + 部署
npm run build
npx wrangler deploy -c .wrangler-deploy.jsonc
