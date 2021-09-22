require('dotenv').config();
var ObjectId = require('mongodb').ObjectId;
const { XummSdk } = require('xumm-sdk');
const Sdk = new XummSdk(
    process.env.XUMM_API_KEY.toString(),
    process.env.XUMM_API_SECRET.toString()
);

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();
const X_USER_WALLET_ADDRESS = (process.env.X_USER_WALLET_ADDRESS).toString();

module.exports = {
    deliver: async (nftId, userWallet) => {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        // // We dont need to call deliver function here, add to claim
        const delivered = await deliver({ X_BRAND_WALLET_ADDRESS, X_BRAND_SEED, X_USER_WALLET_ADDRESS: userWallet }); //Get X_USER_WALLET_ADDRESS from XUMM event

        const nftPopulated = await sails.models.nftform.findOne({ "id": nftId })
            .populate('status')
            .populate('xrpl_tx')
            .populate('xumm');

        nftPopulated.delived = []

        const updateNftStatusResponse = await NFTFormService.updateStatus('delivered', nftId)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";
            res_obj.data = { nft: nftPopulated }

            return res_obj;
        }

        // TODO: It returns accepted=true even before accepting an nft in XUMM app.
        if (!delivered.accepted) {
            res_obj.success = false;
            res_obj.message = "NFT not delivered";
            res_obj.data = { nft: nftPopulated }

            return res_obj;
        }

        nftPopulated.delived = delivered

        sails.sockets.blast('delivered', {
            nftId: nftId
        })

        res_obj.success = true
        res_obj.message = "NFT delivered successfully."
        res_obj.data = { nft: nftPopulated }

        return res_obj

    },
};
