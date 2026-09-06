#!/usr/bin/env node
/**
 * OpenAPI 代码生成脚本
 * 
 * 从 L3 后端拉取 OpenAPI JSON 并使用 openapi-typescript-codegen 生成 TypeScript 客户端
 * 
 * 用法: npm run gen:api
 * 
 * 前提: L3 后端必须运行在 http://localhost:5000
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const L3_BASE_URL = 'http://localhost:5000';
const SWAGGER_URL = `${L3_BASE_URL}/swagger/v1/swagger.json`;
const OUTPUT_DIR = join(process.cwd(), 'src', 'api', 'generated');
const OPENAPI_DIR = join(process.cwd(), 'openapi');

async function main() {
  console.log('📥 Fetching OpenAPI spec from L3...');
  console.log(`   URL: ${SWAGGER_URL}`);
  
  try {
    const response = await fetch(SWAGGER_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const spec = await response.json();
    
    // 保存 OpenAPI JSON 到 openapi/ 目录
    if (!existsSync(OPENAPI_DIR)) {
      mkdirSync(OPENAPI_DIR, { recursive: true });
    }
    
    const specPath = join(OPENAPI_DIR, 'openapi.json');
    writeFileSync(specPath, JSON.stringify(spec, null, 2));
    console.log(`✅ OpenAPI spec saved to: ${specPath}`);
    
    // 使用 openapi-typescript-codegen 生成 TypeScript 客户端
    console.log('\n🔧 Generating TypeScript client...');
    
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const command = [
      'npx',
      'openapi-typescript-codegen',
      '--input', specPath,
      '--output', OUTPUT_DIR,
      '--client', 'axios',
      '--useOptions',
      '--useUnionTypes'
    ].join(' ');
    
    console.log(`   Running: ${command}\n`);
    execSync(command, { stdio: 'inherit' });
    
    console.log(`\n✅ TypeScript client generated to: ${OUTPUT_DIR}`);
    console.log('\n💡 Note: 当前手动维护 src/types/index.ts');
    console.log('   生成的类型位于 src/api/generated/，可作为参考或未来替代手动类型');
    
  } catch (error) {
    console.error('\n❌ Failed to generate API client:');
    console.error(error.message);
    console.error('\n💡 确保 L3 后端运行在 http://localhost:5000');
    console.error('   启动命令: cd ../src/MinGo.Quartz.Platform && dotnet run');
    process.exit(1);
  }
}

main();
