import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'
import { ChatService } from '../src/chat-service.js'
import { createDemoStore } from '../src/seed.js'

describe('chat business rules (unit tests, memory adapter)', () => {
  let service: ChatService
  beforeEach(() => { service = new ChatService(createDemoStore()) })

  test('each event has its own idempotent group chat and isolated history', () => {
    const first = service.CreateGroupChat('unit-event-one', 'First event', 'cathy')
    const second = service.CreateGroupChat('unit-event-two', 'Second event', 'cathy')
    const duplicate = service.CreateGroupChat('unit-event-one', 'First event', 'cathy')
    assert.equal(duplicate.id, first.id)
    assert.notEqual(first.id, second.id)
    service.send(first.id, 'cathy', 'Where should we meet?')
    assert.deepEqual(service.history(second.id, 'cathy').items, [])
    assert.equal(service.history(first.id, 'cathy').items[0].body, 'Where should we meet?')
  })

  test('interested participants can start one shared direct conversation in either direction', () => {
    service.participate('night-market', 'nadia', 'interested')
    const direct = service.direct('cathy', 'nadia')
    assert.equal(direct.kind, 'direct')
    assert.deepEqual(direct.members.map((member) => member.userId).sort(), ['cathy', 'nadia'])
    assert.equal(service.direct('nadia', 'cathy').id, direct.id)
    const message = service.send(direct.id, 'nadia', 'See you at the entrance')
    assert.deepEqual(service.history(direct.id, 'cathy').items, [message])
    assert.throws(() => service.history(direct.id, 'alex'), { code: 'FORBIDDEN' })
  })

  test('self messaging and unrelated or withdrawn users cannot create a direct chat', () => {
    const count = service.store.conversations.size
    assert.throws(() => service.direct('cathy', 'cathy'), { code: 'INVALID_INPUT' })
    assert.throws(() => service.direct('cathy', 'run-club'), { code: 'FORBIDDEN' })
    service.participate('night-market', 'alex', 'withdrawn')
    assert.throws(() => service.direct('cathy', 'alex'), { code: 'FORBIDDEN' })
    assert.equal(service.store.conversations.size, count)
  })

  test('permissions are checked before validating or saving the message', () => {
    const before = [...service.history('chat-night-market', 'mina').items]
    assert.throws(() => service.send('chat-night-market', 'nadia', ''), { code: 'FORBIDDEN' })
    service.participate('night-market', 'cathy', 'withdrawn')
    assert.throws(() => service.send('chat-night-market', 'cathy', 'Blocked'), { code: 'FORBIDDEN' })
    assert.throws(() => service.history('chat-night-market', 'cathy'), { code: 'FORBIDDEN' })
    assert.deepEqual(service.history('chat-night-market', 'mina').items, before)
  })

  for (const body of ['', '   ', 123, null, 'x'.repeat(2001)]) {
    test(`invalid message ${typeof body === 'string' ? `of length ${body.length}` : String(body)} is never saved`, () => {
      const before = [...service.history('chat-night-market', 'cathy').items]
      assert.throws(() => service.send('chat-night-market', 'cathy', body), { code: 'INVALID_INPUT' })
      assert.deepEqual(service.history('chat-night-market', 'cathy').items, before)
    })
  }

  test('returning to a conversation reads the saved messages in order', () => {
    const question = service.send('chat-night-market', 'cathy', 'Where do we meet?')
    const reply = service.send('chat-night-market', 'mina', 'At the main entrance')
    // A new service using the same adapter models returning to the app, not a
    // process restart. The PostgreSQL regression tests exercise restart durability.
    const returning = new ChatService(service.store)
    assert.deepEqual(returning.history('chat-night-market', 'cathy', 2).items, [question, reply])
    assert.equal(returning.history('mina-dm', 'cathy').items.some((item) => item.id === question.id), false)
  })
})
