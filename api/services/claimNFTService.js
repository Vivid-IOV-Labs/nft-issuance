require('dotenv').config();
const { XummSdk } = require('xumm-sdk');
const Sdk = new XummSdk(
  process.env.XUMM_API_KEY.toString(),
  process.env.XUMM_API_SECRET.toString()
);


module.exports = {
  listen: async (request, nftId) => {
    var payloadEventId = ''
    const subscription = await Sdk.payload.createAndSubscribe(request, event => {      
      if (typeof event.data.message !== 'undefined') {
        payloadEventId = event.data.message.split(' ')[1]
      }
      if (event.data.expires_in_seconds === 0) {
        sails.log.debug(`NFT has expired. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
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
        sails.log.debug(`NFT has been delivered. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
        sails.sockets.blast('delivered', {
          nftId: nftId
        })    
      }
      if (event.data.signed === false) {
        sails.log.debug(`NFT has been rejected. nftId: ${nftId}, payloadEventId: ${payloadEventId}`)
        sails.sockets.blast('rejected', {
          nftId: nftId
        })
      }
    })
    
    return subscription.created
  },
};
