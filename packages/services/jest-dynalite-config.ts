module.exports = {
  tables: [
    {
      TableName: 'users',
      KeySchema: [
        { AttributeName: 'email', KeyType: 'HASH' },
        { AttributeName: 'name', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'email', AttributeType: 'S' },
        { AttributeName: 'name', AttributeType: 'S' },
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
      data: [
        {
          email: 'example1@example.com',
          name: 'example1',
          lastName: 'example1',
          age: 30,
        },
        {
          email: 'example2@example.com',
          name: 'example2',
          lastName: 'example2',
          age: 20,
        },
      ],
    },
  ],
  basePort: 9876,
};
