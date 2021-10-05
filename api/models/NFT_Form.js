/**
 * NFT_Form.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  schema: false,
  attributes: {

    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    previous_status: { type: 'string' },
    current_status: { type: 'string' },
    locked: { type: 'boolean', defaultsTo: false},

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝
    details: {
      type: "json"
    },


    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝

    status: {
      collection: 'NFT_Form_Status',
      via: 'nft'
    },

    xrpl_tx: {
      collection: 'Xrpl_Transactions',
      via: 'nft'
    },

    xumm: {
      collection: 'Xumm',
      via: 'nft'
    },

    xumm_response: {
      collection: 'Xumm_Responses',
      via: 'nft'
    },

    nft_claim_verification: {
      collection: 'NFT_Claim_Verification',
      via: 'nft'
    }



  },

};

