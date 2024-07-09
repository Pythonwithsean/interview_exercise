import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { MessageData } from './message.data';
import { ChatMessageModel, ChatMessageSchema } from './models/message.model';

import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import { getTestConfiguration } from '../configuration/configuration-manager.utils';
import got from 'got';
import { Message } from './message';

const id = new ObjectID('5fe0cce861c8ea54018385af');
const conversationId = new ObjectID();
const senderId = new ObjectID('5fe0cce861c8ea54018385af');
const sender2Id = new ObjectID('5fe0cce861c8ea54018385aa');
const sender3Id = new ObjectID('5fe0cce861c8ea54018385ab');

class TestMessageData extends MessageData {
  async deleteMany() {
    await this.chatMessageModel.deleteMany();
  }
}

describe('MessageData', () => {
  let messageData: TestMessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          useFactory: () => {
            const databaseConfig =
              getTestConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [TestMessageData],
    }).compile();

    messageData = module.get<TestMessageData>(TestMessageData);
  });

  beforeEach(
    async () => {
      messageData.deleteMany();
    }
  );

  afterEach(async () => {
    messageData.deleteMany();
  });

  it('should be defined', () => {
    expect(messageData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(messageData.create).toBeDefined();
    });

    it('successfully creates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world', tags: ['tag1', 'tag2'] },
        senderId,
      );

      expect(message).toMatchObject(
        {
          likes: [],
          resolved: false,
          deleted: false,
          reactions: [],
          text: 'Hello world',
          senderId: senderId,
          conversationId: conversationId,
          conversation: { id: conversationId.toHexString() },
          likesCount: 0,
          sender: { id: senderId.toHexString() },
          tags: ['tag1', 'tag2']
        }
      );

    });
  });


  describe('getMessage', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const gotMessage = await messageData.getMessage(sentMessage.id.toHexString())

      expect(gotMessage).toMatchObject(sentMessage)
    });
  });

  describe('MessageTags should exist in message', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message and should contain tags', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world', tags: ['tag1', 'tag2'] },
        senderId,
      );

      const gotMessage = await messageData.getMessage(sentMessage.id.toHexString())
      if (!gotMessage.tags) {
        throw new Error('Tags are not defined')
      }
      expect(gotMessage.tags).toContain('tag1')
      expect(gotMessage.tags).toContain('tag2')
    });
  });

  describe('updateTag', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully updates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world', tags: ['tag1', 'tag2'] },
        senderId,
      );
      await messageData.updateTag(message.id.toHexString(), ['tag3', 'tag4'])
      const updatedMessage = await messageData.getMessage(message.id.toHexString())
      if (!updatedMessage.tags) {
        throw new Error('Tags are not defined')
      }
      expect(updatedMessage.tags).toContain('tag3')
      expect(updatedMessage.tags).toContain('tag4')
      expect(updatedMessage.tags).not.toContain('tag1')
      expect(updatedMessage.tags).not.toContain('tag2')

    });
  });

  describe('searchOnTags', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully searches for messages that contains Tag', async () => {
      const conversationId = new ObjectID()
      const message = await messageData.create(
        { conversationId, text: 'Hello world', tags: ['tag1', 'tag2'] },
        senderId,
      );
      const message2 = await messageData.create(
        { conversationId, text: 'Hello Jack', tags: ['tag1', 'tag3'] },
        senderId,
      );
      const searchResult = await messageData.findMessagesByTag('tag1')
      expect(searchResult).toContainEqual(message)
      expect(searchResult).toContainEqual(message2)

    });
  });



  describe('delete', () => {
    it('successfully marks a message as deleted', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to delete' },
        senderId,
      );

      // Make sure that it started off as not deleted
      expect(message.deleted).toEqual(false);

      const deletedMessage = await messageData.delete(new ObjectID(message.id));
      expect(deletedMessage.deleted).toEqual(true);

      // And that is it now deleted
      const retrievedMessage = await messageData.getMessage(message.id.toHexString())
      expect(retrievedMessage.deleted).toEqual(true);
    });
  });
});
