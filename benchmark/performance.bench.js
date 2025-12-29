import { performance } from 'perf_hooks'

// Simulate the performance-critical operations we'll optimize

console.log('Performance Benchmark Suite')
console.log('='.repeat(50))

const results = {
  reliableMessageDedup: { before: 0, after: 0 },
  expiredMessageCleanup: { before: 0, after: 0 },
  roomOperations: { before: 0, after: 0 },
  parseMessage: { before: 0, after: 0 },
  sendMessage: { before: 0, after: 0 }
}

// Benchmark 1: Reliable Message Deduplication
// Current implementation uses filter on every check
function benchmarkReliableMessageDedupCurrent() {
  const receivedReliableMessages = []
  const expireTime = 15_000
  const messageIds = Array.from({ length: 1000 }, (_, i) => `msg-${i}`)

  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    const id = messageIds[i % 1000]
    // Current implementation: filter on every check
    if (receivedReliableMessages.filter(obj => obj.id === id).length === 0) {
      receivedReliableMessages.push({
        id,
        timestamp: new Date(),
        expire: Date.now() + expireTime
      })
    }
  }
  const end = performance.now()
  return end - start
}

function benchmarkReliableMessageDedupOptimized() {
  const receivedReliableMessages = new Set()
  const expireTime = 15_000
  const messageIds = Array.from({ length: 1000 }, (_, i) => `msg-${i}`)

  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    const id = messageIds[i % 1000]
    // Optimized: Set.has is O(1)
    if (!receivedReliableMessages.has(id)) {
      receivedReliableMessages.add(id)
    }
  }
  const end = performance.now()
  return end - start
}

// Benchmark 2: Expired Message Cleanup
// Current implementation uses forEach with splice (O(n²))
function benchmarkExpiredCleanupCurrent() {
  const receivedReliableMessages = Array.from({ length: 500 }, (_, i) => ({
    id: `msg-${i}`,
    timestamp: new Date(),
    expire: Date.now() - (i % 2 === 0 ? 20000 : -5000) // Half expired
  }))

  const start = performance.now()
  for (let iter = 0; iter < 1000; iter++) {
    const currentTime = Date.now()
    receivedReliableMessages.forEach((msg, index, object) => {
      if (msg.expire <= currentTime) {
        object.splice(index, 1)
      }
    })
  }
  const end = performance.now()
  return end - start
}

function benchmarkExpiredCleanupOptimized() {
  const receivedReliableMessages = new Set()
  const receivedReliableMessagesExpiry = new Map()
  // Initialize with messages
  for (let i = 0; i < 500; i++) {
    const id = `msg-${i}`
    receivedReliableMessages.add(id)
    receivedReliableMessagesExpiry.set(id, Date.now() - (i % 2 === 0 ? 20000 : -5000))
  }

  const start = performance.now()
  for (let iter = 0; iter < 1000; iter++) {
    const currentTime = Date.now()
    // Optimized: periodic cleanup (every ~100 messages) with Set/Map for O(1) operations
    if (receivedReliableMessages.size % 100 === 0) {
      for (const [id, expire] of receivedReliableMessagesExpiry.entries()) {
        if (expire <= currentTime) {
          receivedReliableMessages.delete(id)
          receivedReliableMessagesExpiry.delete(id)
        }
      }
    }
  }
  const end = performance.now()
  return end - start
}

// Benchmark 3: Room Operations (iterating connections)
function benchmarkRoomOperationsCurrent() {
  const connections = new Map()
  for (let i = 0; i < 1000; i++) {
    connections.set(`id-${i}`, {
      channel: {
        roomId: `room-${i % 10}`,
        id: `id-${i}`
      }
    })
  }

  const start = performance.now()
  for (let iter = 0; iter < 100; iter++) {
    const targetRoomId = `room-${iter % 10}`
    connections.forEach(connection => {
      if (connection.channel.roomId === targetRoomId) {
        // Simulate work
        void connection.channel.id
      }
    })
  }
  const end = performance.now()
  return end - start
}

function benchmarkRoomOperationsOptimized() {
  const connections = new Map()
  const rooms = new Map() // Room index: roomId -> Set of channel IDs
  for (let i = 0; i < 1000; i++) {
    const roomId = `room-${i % 10}`
    const channelId = `id-${i}`
    connections.set(channelId, {
      channel: {
        roomId,
        id: channelId
      }
    })
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set())
    }
    rooms.get(roomId).add(channelId)
  }

  const start = performance.now()
  for (let iter = 0; iter < 100; iter++) {
    const targetRoomId = `room-${iter % 10}`
    const channelIds = rooms.get(targetRoomId)
    if (channelIds) {
      channelIds.forEach(channelId => {
        const connection = connections.get(channelId)
        if (connection) {
          // Simulate work
          void connection.channel.id
        }
      })
    }
  }
  const end = performance.now()
  return end - start
}

// Benchmark 4: Parse Message (Object.keys/values)
function benchmarkParseMessageCurrent() {
  const messages = Array.from({ length: 1000 }, (_, i) => {
    return JSON.stringify({ [`event-${i}`]: { data: `value-${i}` } })
  })

  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    const data = messages[i % 1000]
    const object = JSON.parse(data)
    const key = Object.keys(object)[0]
    const value = object[key]
    void key
    void value
  }
  const end = performance.now()
  return end - start
}

function benchmarkParseMessageOptimized() {
  const messages = Array.from({ length: 1000 }, (_, i) => {
    return JSON.stringify({ [`event-${i}`]: { data: `value-${i}` } })
  })

  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    const data = messages[i % 1000]
    const object = JSON.parse(data)
    // Optimized: use Object.entries or for...in loop
    const [key, value] = Object.entries(object)[0]
    void key
    void value
  }
  const end = performance.now()
  return end - start
}

// Benchmark 5: Send Message (Promise.resolve wrapper)
async function benchmarkSendMessageCurrent() {
  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    await Promise.resolve().then(() => {
      // Simulate send operation
      void 'send'
    })
  }
  const end = performance.now()
  return end - start
}

async function benchmarkSendMessageOptimized() {
  const start = performance.now()
  for (let i = 0; i < 10000; i++) {
    // Optimized: remove unnecessary Promise.resolve wrapper
    await new Promise(resolve => {
      // Simulate send operation
      void 'send'
      resolve()
    })
  }
  const end = performance.now()
  return end - start
}

// Run benchmarks
console.log('\n1. Reliable Message Deduplication:')
console.log('   Running current implementation...')
results.reliableMessageDedup.before = benchmarkReliableMessageDedupCurrent()
console.log('   Running optimized implementation...')
results.reliableMessageDedup.after = benchmarkReliableMessageDedupOptimized()

console.log('\n2. Expired Message Cleanup:')
console.log('   Running current implementation...')
results.expiredMessageCleanup.before = benchmarkExpiredCleanupCurrent()
console.log('   Running optimized implementation...')
results.expiredMessageCleanup.after = benchmarkExpiredCleanupOptimized()

console.log('\n3. Room Operations:')
console.log('   Running current implementation...')
results.roomOperations.before = benchmarkRoomOperationsCurrent()
console.log('   Running optimized implementation...')
results.roomOperations.after = benchmarkRoomOperationsOptimized()

console.log('\n4. Parse Message:')
console.log('   Running current implementation...')
results.parseMessage.before = benchmarkParseMessageCurrent()
console.log('   Running optimized implementation...')
results.parseMessage.after = benchmarkParseMessageOptimized()

console.log('\n5. Send Message:')
console.log('   Running current implementation...')
await benchmarkSendMessageCurrent().then(time => {
  results.sendMessage.before = time
})
console.log('   Running optimized implementation...')
await benchmarkSendMessageOptimized().then(time => {
  results.sendMessage.after = time
})

// Print results
console.log('\n' + '='.repeat(50))
console.log('BENCHMARK RESULTS')
console.log('='.repeat(50))

function printResults(name, before, after) {
  const improvement = ((before - after) / before * 100).toFixed(2)
  const speedup = (before / after).toFixed(2)
  console.log(`\n${name}:`)
  console.log(`  Before: ${before.toFixed(2)}ms`)
  console.log(`  After:  ${after.toFixed(2)}ms`)
  console.log(`  Improvement: ${improvement}%`)
  console.log(`  Speedup: ${speedup}x`)
}

printResults('Reliable Message Deduplication', results.reliableMessageDedup.before, results.reliableMessageDedup.after)
printResults('Expired Message Cleanup', results.expiredMessageCleanup.before, results.expiredMessageCleanup.after)
printResults('Room Operations', results.roomOperations.before, results.roomOperations.after)
printResults('Parse Message', results.parseMessage.before, results.parseMessage.after)
printResults('Send Message', results.sendMessage.before, results.sendMessage.after)

console.log('\n' + '='.repeat(50))

