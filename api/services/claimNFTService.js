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

        const subscription = await Sdk.payload.createAndSubscribe(request, async (event) => {
            if (typeof event.data.message !== 'undefined') {
                payloadEventId = event.data.message.split(' ')[1]
            }
            if (event.data.expires_in_seconds === 0) {
                const payloadStatus = 'expired'
                _updateXummRecord(nftId, event.data, payloadStatus)
                _unlockNft(nftId)
                sails.log.debug(`NFT has ${payloadStatus}. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
                sails.sockets.blast(payloadStatus, {
                    nftId: nftId
                })
            }
            if (event.data.opened === true) {
                const payloadStatus = 'scanned'
                _updateXummRecord(nftId, event.data, payloadStatus)
                sails.log.debug(`QR code has been ${payloadStatus}. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
                sails.sockets.blast(payloadStatus, {
                    nftId: nftId
                })
            }
            if (event.data.signed === true) {
                const payloadStatus = 'signed'
                sails.log.debug(`NFT has been ${payloadStatus}. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
                await _updateXummRecord(nftId, event.data, payloadStatus)
                sails.sockets.blast(payloadStatus, {
                    nftId: nftId
                })
                            
                await deliverNFTService.run(nftId)
                _updateXummRecord(nftId, event.data, 'delivered')
            }
            if (event.data.signed === false) {
                const payloadStatus = 'rejected'
                sails.log.debug(`NFT has been ${payloadStatus}. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
                _updateXummRecord(nftId, event.data, payloadStatus)
                _unlockNft(nftId)
                sails.sockets.blast(payloadStatus, {
                    nftId: nftId
                })
            }
        })
        return subscription.created
    },
};

_lockNft = async (nftId) => {
    /*
        Set locked=true in NFTForm table
    */

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
        sails.log.error(`Could not lock nftForm. nftId: ${nftId}`);
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
        sails.log.error(`Could not unlock nftForm. nftId: ${nftId}`);
    }
}

_updateXummRecord = async (nftId, event, payloadStatus) => {
    const payload = event.payload_uuidv4 ? await Sdk.payload.get(event.payload_uuidv4) : {}
    // console.log(payload.response.account)
    // TODO: Create new table xummResponses. Associate with xumm record. (One-to-many relathionship)
    // Call _updateXummRecord() on each state 'rejected', 'signed' etc and add new record to xummResponse every time.
    // xummResponses table will have 'payload', 'payloadStatus'

    const xumm = await sails.models.xumm.find({ nft: nftId })
        .sort('createdAt DESC')
        .limit(1)

    const xummResponsesNewRecord = {
        xumm: xumm[0].id,
        payload: payload,
        payloadStatus: payloadStatus,
        nft: nftId,
    }
    await sails.models.xummresponses.create(xummResponsesNewRecord)
}