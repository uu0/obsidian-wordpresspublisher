#!/bin/bash

# 开发后自动检查脚本
# 在每次功能开发或 bug 修复后自动运行

set -e

echo "🧪 Running tests..."
npm test

echo ""
echo "🔨 Building plugin..."
npm run build

echo ""
echo "✅ All checks passed!"
echo ""
echo "📝 Ready to commit. Files changed:"
git status --short
