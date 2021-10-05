require('dotenv').config();
var ObjectId = require('mongodb').ObjectId;
const { XummSdk } = require('xumm-sdk');
const Sdk = new XummSdk(
    process.env.XUMM_API_KEY.toString(),
    process.env.XUMM_API_SECRET.toString()
);

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();

module.exports = {
    run: async (nftId, userWallet) => {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        // We need it to populate nftForm only when it is called from nft/deliver endpoint
        let xummAssociationOptions = {}

        if (typeof userWallet === 'undefined') {
            const xummResponses = await sails.models.xummresponses.findOne({ nft: nftId, payloadStatus: 'signed' })
            userWallet = xummResponses.payload.response.account
            xummAssociationOptions = { where: { id: xummResponses.id } }
        }

        const delivered = await NFTService.deliver({ X_BRAND_WALLET_ADDRESS, X_BRAND_SEED, X_USER_WALLET_ADDRESS: userWallet });

        const updateNftStatusResponse = await NFTFormService.updateStatus('delivered', nftId)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res_obj;
        }

        const nft_form_status = updateNftStatusResponse.nft_form_status
        const nft = updateNftStatusResponse.nft

        const xrpl_tx = await sails.models.xrpltransactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": delivered }).fetch();

        let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }
        let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx.id } }

        const nftPopulated = await sails.models.nftform.findOne({ "id": nftId })
            .populate('status', statusAssociationOptions)
            .populate('xrpl_tx', xrplTransactionsAssociationOptions)
            .populate('xumm', xummAssociationOptions);

        if (delivered.engine_result !== "tesSUCCESS" || delivered.accepted !== true) {
            res_obj.success = false;
            res_obj.message = "NFT not delivered";

            return res_obj;
        }

        sails.sockets.blast('delivered', {
            nftId: nftId
        })

        res_obj.success = true
        res_obj.message = "NFT delivered successfully."
        res_obj.data = { nft: nftPopulated }

        return res_obj
    },
};
