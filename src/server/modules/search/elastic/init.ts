#!/usr/bin/env node

import { initializeIndex, checkElasticHealth } from './client'
import { registerElasticHandler } from './handler'

async function initializeSearchInfrastructure() {
  console.log('🚀 Initializing search infrastructure...')

  // Check cluster health
  console.log('🏥 Checking ElasticSearch health...')
  const isHealthy = await checkElasticHealth()

  if (!isHealthy) {
    console.error('❌ ElasticSearch cluster is not healthy!')
    console.log('   Please ensure ElasticSearch is running:')
    console.log('   docker run -d -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.11.0')
    process.exit(1)
  }

  console.log('✅ ElasticSearch cluster is healthy')

  // Initialize index
  console.log('📑 Initializing search index...')
  try {
    await initializeIndex()
    console.log('✅ Search index initialized')
  } catch (error) {
    console.error('❌ Failed to initialize index:', error)
    process.exit(1)
  }

  // Register handler
  console.log('🔌 Registering search handler...')
  registerElasticHandler()
  console.log('✅ Search handler registered')

  console.log('\n🎉 Search infrastructure initialized successfully!')
  console.log('\nNext steps:')
  console.log('1. Run search benchmarks: bun run search:benchmark')
  console.log('2. Start the application: bun run dev')
  console.log('3. Access search API: POST /api/search')
  console.log('4. View metrics: GET /api/search/metrics')
}

// Run initialization
initializeSearchInfrastructure()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Initialization failed:', error)
    process.exit(1)
  })