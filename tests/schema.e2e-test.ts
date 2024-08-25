import { test, expect } from 'vitest';
import { v6 as uuidv6 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import {
    createEvent,
    createEvent2,
    createScene,
    createScene2,
    createMedia,
    createMedia2,
    createShareLink,
    createExpiredShareLink,
    softDeleteEvent,
    softDeleteScene,
    softDeleteMedia,
    softDeleteShareLink,
    fetchActiveEvent,
    fetchActiveScene,
    fetchActiveMedia,
    fetchActiveShareLink,
    restoreEvent,
    restoreScene,
    restoreMedia,
    restoreShareLink,
    eventData,
    sceneData,
    mediaData
} from './utlis/test-helpers'; 

const prisma = new PrismaClient()


beforeEach(async () => {
    await prisma.shareLink.deleteMany();
    await prisma.media.deleteMany();
    await prisma.scene.deleteMany();
    await prisma.event.deleteMany();
});

afterEach(async () => {
    await prisma.shareLink.deleteMany();
    await prisma.media.deleteMany();
    await prisma.scene.deleteMany();
    await prisma.event.deleteMany();
});

test("should create and retrieve an event by name", async () => {
    const createdEvent = await createEvent();

    const fetchedEvent = await prisma.event.findFirst({
        where: {
            name: eventData.name,
        },
    });

    expect(fetchedEvent).not.toBeNull();
    expect(fetchedEvent?.name).toBe(createdEvent.name);
    expect(fetchedEvent?.expiry.toISOString()).toBe(eventData.expiry.toISOString());
});

test("should create and retrieve a scene by name and verify it belongs to the event", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);

    const fetchedScene = await prisma.scene.findFirst({
        where: {
            name: sceneData.name,
        },
    });

    expect(fetchedScene).not.toBeNull();
    expect(fetchedScene?.name).toBe(createdScene.name);
    expect(fetchedScene?.event_id).toBe(createdEvent.id);

    const fetchedEventWithScenes = await prisma.event.findUnique({
        where: {
            id: createdEvent.id,
        },
        include: {
            scenes: true,
        },
    });

    expect(fetchedEventWithScenes).not.toBeNull();
    expect(fetchedEventWithScenes?.scenes).toHaveLength(1);
    expect(fetchedEventWithScenes?.scenes[0].name).toBe(sceneData.name);
});

test("should create and retrieve media and verify it belongs to the scene", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    const fetchedMedia = await prisma.media.findFirst({
        where: {
            web_resolution_url: mediaData.web_resolution_url,
        },
    });

    expect(fetchedMedia).not.toBeNull();
    expect(fetchedMedia?.image_order).toBe(createdMedia.image_order);
    expect(fetchedMedia?.web_resolution_url).toBe(createdMedia.web_resolution_url);
    expect(fetchedMedia?.high_resolution_url).toBe(createdMedia.high_resolution_url);
    expect(fetchedMedia?.scene_id).toBe(createdScene.id);

    const fetchedSceneWithMedia = await prisma.scene.findUnique({
        where: {
            id: createdScene.id,
        },
        include: {
            media: true,
        },
    });

    expect(fetchedSceneWithMedia).not.toBeNull();
    expect(fetchedSceneWithMedia?.media).toHaveLength(1);
    expect(fetchedSceneWithMedia?.media[0].web_resolution_url).toBe(mediaData.web_resolution_url);
});

test("should create and retrieve the shareLink, check it's validity & verify it belongs to the event", async () => {
    const createdEvent = await createEvent();
    const createdShareLink = await createShareLink(createdEvent.id);

    const fetchedShareLink = await prisma.shareLink.findFirst({
        where: {
            key: createdShareLink.key,
        },
    });

    expect(fetchedShareLink).not.toBeNull();
    expect(fetchedShareLink?.createdAt).toStrictEqual(createdShareLink.createdAt);
    expect(fetchedShareLink?.expiry).toStrictEqual(createdShareLink.expiry);
    expect(fetchedShareLink?.key).toBe(createdShareLink.key);
    expect(fetchedShareLink?.event_id).toBe(createdEvent.id);
});

test("should delete an event and verify related scenes, media and shareLink are also deleted", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);
    const createdShareLink = await createShareLink(createdEvent.id)

    await prisma.event.delete({
        where: {
            id: createdEvent.id,
        },
    });

    const fetchedEvent = await prisma.event.findUnique({
        where: {
            id: createdEvent.id,
        },
    });
    expect(fetchedEvent).toBeNull();

    const fetchedScene = await prisma.scene.findUnique({
        where: {
            id: createdScene.id,
        },
    });
    expect(fetchedScene).toBeNull();

    const fetchedMedia = await prisma.media.findUnique({
        where: {
            id: createdMedia.id,
        },
    });
    expect(fetchedMedia).toBeNull();

    const fetchedShareLink = await prisma.shareLink.findUnique({
        where: { key: createdShareLink.key, },
    })
    expect(fetchedShareLink).toBeNull();
});

test("should delete a scene and verify related media are also deleted", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await prisma.scene.delete({
        where: {
            id: createdScene.id,
        },
    });

    const fetchedScene = await prisma.scene.findUnique({
        where: {
            id: createdScene.id,
        },
    });
    expect(fetchedScene).toBeNull();

    const fetchedMedia = await prisma.media.findUnique({
        where: {
            id: createdMedia.id,
        },
    });
    expect(fetchedMedia).toBeNull();

    const fetchedEventWithScenes = await prisma.event.findUnique({
        where: {
            id: createdEvent.id,
        },
        include: {
            scenes: true,
        },
    });

    expect(fetchedEventWithScenes).not.toBeNull();
    expect(fetchedEventWithScenes?.scenes).toHaveLength(0);
});

test("should delete media and verify it is removed from the scene", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await prisma.media.delete({
        where: {
            id: createdMedia.id,
        },
    });

    const fetchedMedia = await prisma.media.findUnique({
        where: {
            id: createdMedia.id,
        },
    });
    expect(fetchedMedia).toBeNull();

    const fetchedSceneWithMedia = await prisma.scene.findUnique({
        where: {
            id: createdScene.id,
        },
        include: {
            media: true,
        },
    });

    expect(fetchedSceneWithMedia).not.toBeNull();
    expect(fetchedSceneWithMedia?.media).toHaveLength(0);
});

test("should delete a shareLink and verify it is removed from the event", async () => {
    const createdEvent = await createEvent();
    const createdShareLink = await createShareLink(createdEvent.id);

    await prisma.shareLink.delete({
        where: {
            key: createdShareLink.key,
        }
    })

    const fetchedShareLink = await prisma.shareLink.findUnique({
        where: {
            key: createdShareLink.key,
        },
    });

    expect(fetchedShareLink).toBeNull();

    const fetchedEventWithShareLink = await prisma.event.findUnique({
        where: {
            id: createdEvent.id,
        },
        include: {
            share_links: true,
        },
    });

    expect(fetchedEventWithShareLink).not.toBeNull();
    expect(fetchedEventWithShareLink?.share_links).toHaveLength(0);
});

test("should not include expired shareLink in the list of valid shareLinks", async () => {
    const createdEvent = await createEvent();

    await createExpiredShareLink(createdEvent.id);

    const validShareLink = await createShareLink(createdEvent.id);

    const activeShareLinks = await prisma.shareLink.findMany({
        where: {
            expiry: {
                gt: new Date(),
            },
        },
    });

    expect(activeShareLinks).toHaveLength(1);
    expect(activeShareLinks[0].key).toBe(validShareLink.key);
});

test("should mark media as selected", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await prisma.media.update({
        where: { id: createdMedia.id },
        data: { selected: true },
    });

    const fetchedMedia = await prisma.media.findUnique({
        where: { id: createdMedia.id },
    });

    expect(fetchedMedia).not.toBeNull();
    expect(fetchedMedia?.selected).toBe(true);
});

test("should unmark media as selected", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await prisma.media.update({
        where: { id: createdMedia.id },
        data: { selected: true },
    });

    await prisma.media.update({
        where: { id: createdMedia.id },
        data: { selected: false },
    });

    const fetchedMedia = await prisma.media.findUnique({
        where: { id: createdMedia.id },
    });

    expect(fetchedMedia).not.toBeNull();
    expect(fetchedMedia?.selected).toBe(false);
});

test("should retrieve only selected media", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia1 = await createMedia(createdScene.id);
    const createdMedia2 = await createMedia2(createdScene.id);

    await prisma.media.update({
        where: { id: createdMedia1.id },
        data: { selected: true },
    });

    const selectedMedia = await prisma.media.findMany({
        where: {
            selected: true,
        },
    });

    expect(selectedMedia).toHaveLength(1);
    expect(selectedMedia[0].id).toBe(createdMedia1.id);
    expect(selectedMedia[0].id).not.toBe(createdMedia2.id);
});

test("should retrieve only unselected media", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia1 = await createMedia(createdScene.id);
    const createdMedia2 = await createMedia2(createdScene.id);

    await prisma.media.update({
        where: { id: createdMedia1.id },
        data: { selected: true },
    });

    const unselectedMedia = await prisma.media.findMany({
        where: {
            selected: false,
        },
    });

    expect(unselectedMedia).toHaveLength(1);
    expect(unselectedMedia[0].id).toBe(createdMedia2.id);
    expect(unselectedMedia[0].id).not.toBe(createdMedia1.id);
});


test("should soft delete an event and verify it and related scenes, media, and shareLink are excluded from active queries", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);
    const createdShareLink = await createShareLink(createdEvent.id);

    await softDeleteEvent(createdEvent.id);

    const fetchedEvent = await fetchActiveEvent(createdEvent.id);
    expect(fetchedEvent).toBeNull();

    const fetchedScene = await fetchActiveScene(createdScene.id);
    expect(fetchedScene).toBeNull();

    const fetchedMedia = await fetchActiveMedia(createdMedia.id);
    expect(fetchedMedia).toBeNull();

    const fetchedShareLink = await fetchActiveShareLink(createdShareLink.key);
    expect(fetchedShareLink).toBeNull();
});


test("should soft delete a scene and verify it and related media are excluded from active queries", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await softDeleteScene(createdScene.id);

    const fetchedScene = await fetchActiveScene(createdScene.id);
    expect(fetchedScene).toBeNull();

    const fetchedMedia = await fetchActiveMedia(createdMedia.id);
    expect(fetchedMedia).toBeNull();
});


test("should soft delete media and verify it is excluded from active queries", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await softDeleteMedia(createdMedia.id);

    const fetchedMedia = await fetchActiveMedia(createdMedia.id);
    expect(fetchedMedia).toBeNull();
});

test("should soft delete a shareLink and verify it is excluded from active queries", async () => {
    const createdEvent = await createEvent();
    const createdShareLink = await createShareLink(createdEvent.id);

    await softDeleteShareLink(createdShareLink.key);

    const fetchedShareLink = await fetchActiveShareLink(createdShareLink.key);
    expect(fetchedShareLink).toBeNull();
});

test("should restore a soft-deleted event and verify related scenes, media, and shareLinks are also restored", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);
    const createdShareLink = await createShareLink(createdEvent.id);

    await softDeleteEvent(createdEvent.id);

    await restoreEvent(createdEvent.id);

    const fetchedEvent = await fetchActiveEvent(createdEvent.id);
    expect(fetchedEvent).not.toBeNull();

    const fetchedScene = await fetchActiveScene(createdScene.id);
    expect(fetchedScene).not.toBeNull();

    const fetchedMedia = await fetchActiveMedia(createdMedia.id);
    expect(fetchedMedia).not.toBeNull();

    const fetchedShareLink = await fetchActiveShareLink(createdShareLink.key);
    expect(fetchedShareLink).not.toBeNull();
});

test("should restore a soft-deleted scene and verify related media are also restored", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await softDeleteScene(createdScene.id);

    await restoreScene(createdScene.id);

    const fetchedScene = await fetchActiveScene(createdScene.id);
    expect(fetchedScene).not.toBeNull();

    const fetchedMedia = await fetchActiveMedia(createdMedia.id);
    expect(fetchedMedia).not.toBeNull();
});

test("should restore a soft-deleted media and verify it is restored correctly", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    const createdMedia = await createMedia(createdScene.id);

    await softDeleteMedia(createdMedia.id);

    await restoreMedia(createdMedia.id);

    const fetchedMedia = await fetchActiveMedia(createdMedia.id);
    expect(fetchedMedia).not.toBeNull();
});

test("should restore a soft-deleted shareLink and verify it is restored correctly", async () => {
    const createdEvent = await createEvent();
    const createdShareLink = await createShareLink(createdEvent.id);

    await softDeleteShareLink(createdShareLink.key);

    await restoreShareLink(createdShareLink.key);

    const fetchedShareLink = await fetchActiveShareLink(createdShareLink.key);
    expect(fetchedShareLink).not.toBeNull();
});

test("should not allow duplicate scene names within the same event", async () => {
    const createdEvent = await createEvent();
    await createScene(createdEvent.id);

    await expect(createScene(createdEvent.id)).rejects.toThrowError();
});


test("should allow duplicate scene names across different events", async () => {
    const event1 = await createEvent();
    const event2 = await createEvent2();

    await createScene(event1.id);

    const sceneInEvent2 = await createScene(event2.id);

    expect(sceneInEvent2.name).toBe(sceneData.name);
});

test("should not allow duplicate media items within the same scene", async () => {
    const createdEvent = await createEvent();
    const createdScene = await createScene(createdEvent.id);
    
    await createMedia(createdScene.id);
    
    await expect(createMedia(createdScene.id)).rejects.toThrowError();
});

test("should allow duplicate media items across different scenes", async () => {
    const event = await createEvent();
    const scene1 = await createScene(event.id);
    const scene2 = await createScene2(event.id);
    
    await createMedia(scene1.id);
    
    const mediaInScene2 = await createMedia(scene2.id);
    
    expect(mediaInScene2.web_resolution_url).toBe(mediaData.web_resolution_url);
});

test("should not allow creation of two events with the same name", async () => {
await createEvent();

await expect(createEvent()).rejects.toThrowError();;
});