import { writeFileSync } from 'fs';
import path from 'path';

async function generate() {
  try {
    console.log('🔍 Fetching OpenAPI spec from /api/swagger...');
    
    // Import the spec directly from the route
    const { GET } = await import('../src/app/api/swagger/route');
    const response = await GET();
    const openApiDoc = await response.json();
    
    const outputPath = path.join(process.cwd(), 'public/openapi.json');
    writeFileSync(outputPath, JSON.stringify(openApiDoc, null, 2));
    
    console.log('✅ OpenAPI spec generated successfully!');
    console.log('📄 File location:', outputPath);
    console.log('🌐 View JSON at: http://localhost:3000/openapi.json');
    console.log('🌐 API Endpoint: http://localhost:3000/api/swagger');
  } catch (error) {
    console.error('❌ Failed to generate OpenAPI spec:', error);
    process.exit(1);
  }
}

generate();

