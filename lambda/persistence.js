module.exports = {
    getPersistenceAdapter(){
        function isAlexaHosted(){
            return process.env.S3_PERSISTENCE_BUCKET ? true : false;
        }
        const tableName = 'rickWikimorty';
        if(isAlexaHosted()){
            const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
            return new S3PersistenceAdapter({
                bucketName: process.env.S3_PERSISTENCE_BUCKET
            });
        }else{
            const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
            return new DynamoDbPersistenceAdapter({
                tableName: tableName,
                createTable: true
            });
        }
    }
}