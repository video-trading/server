import { objectIdToId } from './objectIdToId';

describe('ObjectIdToId', () => {
  it('should convert an ObjectId to an id', () => {
    const object = {
      _id: {
        $oid: '123',
      },
      value: 'test',
    };

    const result = objectIdToId(object);
    expect(result).toStrictEqual({
      _id: '123',
      value: 'test',
    });
  });

  it('should convert an nested ObjectId to an id', () => {
    const object = {
      _id: {
        $oid: '123',
      },
      value: {
        _id: {
          $oid: '123',
        },
        value: 'test',
      },
    };

    const result = objectIdToId(object);
    expect(result).toStrictEqual({
      _id: '123',
      value: {
        _id: '123',
        value: 'test',
      },
    });
  });
});
