require('dotenv').config();
var ObjectId = require('mongodb').ObjectId;
const { XummSdk } = require('xumm-sdk');
const Sdk = new XummSdk(
  process.env.XUMM_API_KEY.toString(),
  process.env.XUMM_API_SECRET.toString()
);


module.exports = {
  listen: async (request, nftId) => {
    var payloadEventId = ''
    _lockNft(nftId)
    
    const subscription = await Sdk.payload.createAndSubscribe(request, event => {
      if (typeof event.data.message !== 'undefined') {
        payloadEventId = event.data.message.split(' ')[1]
      }
      if (event.data.expires_in_seconds === 0) {
        sails.log.debug(`NFT has expired. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
        _unlockNft(nftId)
        sails.sockets.blast('expired', {
          nftId: nftId
        })
      }
      if (event.data.opened === true) {
        sails.log.debug(`QR code has been scanned. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
        sails.sockets.blast('scanned', {
          nftId: nftId
        })
      }
      if (event.data.signed === true) {
        sails.log.debug(`NFT has been signed. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
        sails.sockets.blast('signed', {
          nftId: nftId
        })
      }
      if (event.data.signed === false) {
        sails.log.debug(`NFT has been rejected. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
        _unlockNft(nftId)
        sails.sockets.blast('rejected', {
          nftId: nftId
        })
      }
    })

    return subscription.created
  },
};

_lockNft = async (nftId) => {
  // Set locked=true in NFTForm table
  
  var db = sails.getDatastore().manager;
  const objectId = new ObjectId(nftId)

  const nftFormUpdateRecord = {
    $set: {
      "locked": true
    }
  }

  var nftFormUpdated = await db.collection('nftform').findOneAndUpdate(
    { _id: objectId }, nftFormUpdateRecord, { returnOriginal: false }
  );

  if (!nftFormUpdated.lastErrorObject.updatedExisting) {
    sails.log.error(`Could not nftForm. nftId: ${nftId}`);
  }
}

_unlockNft = async (nftId) => {
  // Set locked=false in NFTForm table

  var db = sails.getDatastore().manager;
  const objectId = new ObjectId(nftId)

  const nftFormUpdateRecord = {
    $set: {
      "locked": false
    }
  }

  var nftFormUpdated = await db.collection('nftform').findOneAndUpdate(
    { _id: objectId }, nftFormUpdateRecord, { returnOriginal: false }
  );

  if (!nftFormUpdated.lastErrorObject.updatedExisting) {
    sails.log.error(`Could not nftForm. nftId: ${nftId}`);
  }
}

