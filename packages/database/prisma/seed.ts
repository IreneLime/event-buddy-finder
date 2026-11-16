import { prisma } from '../src/client.js'

const users = [
  { firebaseUid: 'demo-cathy', email: 'cathy@example.test', displayName: 'Cathy Chen', ageRange: '18_24', affiliation: 'University of Toronto · ECE', bio: 'Always up for a new café, live music, or a creative afternoon. Currently learning pottery.' },
  { firebaseUid: 'demo-mina', email: 'mina@example.test', displayName: 'Mina Park', ageRange: '25_34', affiliation: 'University of Toronto · Architecture', bio: 'Weekend market wanderer and enthusiastic dumpling recommender. Happy to meet new neighbours.' },
  { firebaseUid: 'demo-alex', email: 'alex@example.test', displayName: 'Alex Rivera', ageRange: '25_34', affiliation: 'Toronto Arts Community', bio: 'Board games, park walks, and discovering small live-music venues.' },
  { firebaseUid: 'demo-nadia', email: 'nadia@example.test', displayName: 'Nadia Chen', ageRange: '18_24', affiliation: 'Markham Community Arts Council', bio: 'I like flower markets, dance workshops, and taking far too many photos.' },
]

const categoryNames = ['Arts', 'Community', 'Dance', 'Food', 'Games', 'Markets', 'Music', 'Outdoors', 'Social', 'Wellness']

const events = [
  { key: 'night-market', owner: 'demo-mina', title: 'Lanterns & Late Bites', description: 'Spend a relaxed Sunday evening exploring the food stalls and local makers at Stackt Market. We will try a few snacks, share recommendations, and leave room for dessert. Come solo or bring a friend; the group will meet at the main entrance before wandering together.', notes: 'Meet beside the Bathurst Street entrance at 6:20 PM. The market is mostly outdoors, so bring a warm layer. Food is pay-as-you-go, with vegetarian options. Message the chat if you are running late.', startsAt: '2026-11-15T18:30:00-05:00', endsAt: '2026-11-15T21:30:00-05:00', venue: 'Stackt Market', city: 'Toronto', address: '28 Bathurst St, Toronto, ON', latitude: 43.6394, longitude: -79.4022, price: '0.00', categories: ['Food', 'Community'], participants: [['demo-cathy', 'interested'], ['demo-alex', 'going'], ['demo-mina', 'going']] as const },
  { key: 'flower-market', owner: 'demo-nadia', title: 'Saturday Flower Market & Coffee', description: 'Browse seasonal flowers, houseplants, and handmade goods along historic Main Street Unionville. We will visit a few stalls together, compare finds, and take a coffee break in the village. It is a relaxed outing for anyone who enjoys local makers or wants to explore Markham.', notes: 'Meet at the south entrance to Main Street at 10:00 AM. Bring a reusable tote and dress for an outdoor market. Purchases are optional; the coffee stop is pay-your-own-way. We will move to a nearby café if it rains.', startsAt: '2026-11-21T10:00:00-05:00', endsAt: '2026-11-21T12:00:00-05:00', venue: 'Main Street Unionville', city: 'Markham', address: 'Main Street Unionville, Markham, ON', latitude: 43.8655, longitude: -79.3127, price: '0.00', categories: ['Markets', 'Community'], participants: [['demo-cathy', 'interested'], ['demo-mina', 'going'], ['demo-nadia', 'going']] as const },
  { key: 'salsa-social', owner: 'demo-alex', title: 'Beginner Salsa Social', description: 'Try a few salsa basics in a friendly beginner lesson, then stay for an open social with music and time to practice. The instructor will break down the steps slowly, rotate partners during the lesson, and keep the atmosphere welcoming for first-timers.', notes: 'Arrive by 6:45 PM for the 7:00 PM lesson. No partner is required. Wear comfortable shoes that stay securely on your feet; the ticket covers the lesson and social dancing.', startsAt: '2026-11-20T19:00:00-05:00', endsAt: '2026-11-20T21:30:00-05:00', venue: 'Dovercourt House', city: 'Toronto', address: '805 Dovercourt Rd, Toronto, ON', latitude: 43.662, longitude: -79.4315, price: '12.00', categories: ['Dance', 'Wellness'], participants: [['demo-cathy', 'going'], ['demo-nadia', 'interested'], ['demo-alex', 'going']] as const },
  { key: 'lakeside-hangout', owner: 'demo-mina', title: 'Lakeside Walk & Hot Chocolate', description: 'Take a relaxed waterfront stroll near Celebration Square and the civic district, with plenty of time to talk and take photos. After the walk, we will find a nearby café for hot chocolate. Join for the walk, the café, or both.', notes: 'Meet by the main entrance to Celebration Square at 2:00 PM. Dress for the weather and wear shoes suitable for a paved walk. The walk is free; drinks are optional and purchased individually.', startsAt: '2026-11-29T14:00:00-05:00', endsAt: '2026-11-29T16:00:00-05:00', venue: 'Celebration Square', city: 'Mississauga', address: '300 City Centre Dr, Mississauga, ON', latitude: 43.589, longitude: -79.6441, price: '0.00', categories: ['Outdoors', 'Social'], participants: [['demo-alex', 'interested'], ['demo-nadia', 'going'], ['demo-mina', 'going']] as const },
]

async function main() {
  for (const user of users) {
    await prisma.appUser.upsert({
      where: { firebaseUid: user.firebaseUid },
      create: { ...user, profileCompletedAt: new Date('2026-10-20T12:00:00Z') },
      update: user,
    })
  }

  for (const name of categoryNames) {
    await prisma.category.upsert({ where: { name }, create: { name }, update: {} })
  }

  for (const data of events) {
    const existing = await prisma.event.findFirst({
      where: { createdByUserId: data.owner, title: data.title, startsAt: new Date(data.startsAt) },
    })
    const event = existing
      ? await prisma.event.update({
        where: { id: existing.id },
        data: {
          description: data.description,
          notes: data.notes,
          endsAt: new Date(data.endsAt),
          locationName: data.venue,
          city: data.city,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          priceAmount: data.price,
        },
      })
      : await prisma.event.create({
        data: {
          createdByUserId: data.owner,
          title: data.title,
          description: data.description,
          notes: data.notes,
          startsAt: new Date(data.startsAt),
          endsAt: new Date(data.endsAt),
          locationName: data.venue,
          city: data.city,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          priceAmount: data.price,
          categories: { create: data.categories.map((name) => ({ category: { connect: { name } } })) },
        },
      })

    if (existing) {
      await prisma.eventCategory.deleteMany({ where: { eventId: event.id } })
      const categories = await prisma.category.findMany({ where: { name: { in: data.categories } }, select: { id: true } })
      await prisma.eventCategory.createMany({
        data: categories.map((category) => ({ eventId: event.id, categoryId: category.id })),
        skipDuplicates: true,
      })
    }

    for (const [userId, status] of data.participants) {
      await prisma.eventParticipation.upsert({
        where: { eventId_userId: { eventId: event.id, userId } },
        create: { eventId: event.id, userId, status },
        update: { status },
      })
    }

    const conversation = await prisma.conversation.upsert({
      where: { eventId: event.id },
      create: { kind: 'event', eventId: event.id },
      update: {},
    })
    const memberIds = new Set([data.owner, ...data.participants.map(([userId]) => userId)])
    for (const userId of memberIds) {
      await prisma.conversationMember.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        create: { conversationId: conversation.id, userId },
        update: {},
      })
    }

    const exampleMessage = data.key === 'night-market'
      ? { sender: 'demo-mina', body: 'I’ll be by the main entrance at 6:20. Message here if you get turned around.' }
      : data.key === 'flower-market'
        ? { sender: 'demo-nadia', body: 'The flower stalls open at 10. Bring a tote if you have one.' }
        : data.key === 'salsa-social'
          ? { sender: 'demo-alex', body: 'First-timers are very welcome. The instructor will teach the basics.' }
          : { sender: 'demo-mina', body: 'We will check the weather and post the route the evening before.' }
    const previousMessage = await prisma.message.findFirst({ where: { conversationId: conversation.id, senderUserId: exampleMessage.sender, body: exampleMessage.body } })
    if (!previousMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId: exampleMessage.sender,
          body: exampleMessage.body,
          createdAt: new Date('2026-11-13T17:00:00-05:00'),
        },
      })
    }
  }

  const cathyMinaConversation = await prisma.conversation.findFirst({
    where: { kind: 'direct', members: { some: { userId: 'demo-cathy' } } },
  })
  const direct = cathyMinaConversation ?? await prisma.conversation.create({ data: { kind: 'direct' } })
  for (const userId of ['demo-cathy', 'demo-mina']) {
    await prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: direct.id, userId } },
      create: { conversationId: direct.id, userId },
      update: {},
    })
  }

  for (const message of [
    { senderUserId: 'demo-cathy', body: 'Want to check out the flower market before the afternoon concert?' },
    { senderUserId: 'demo-mina', body: 'That sounds perfect. I know a coffee place nearby too.' },
  ]) {
    const previousMessage = await prisma.message.findFirst({ where: { conversationId: direct.id, ...message } })
    if (!previousMessage) await prisma.message.create({ data: { conversationId: direct.id, ...message } })
  }

  console.info('Seeded fictional Event Buddy Finder users, events, participation, and chats.')
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
