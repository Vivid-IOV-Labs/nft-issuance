require('dotenv').config();

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
            const xummResponses = await sails.models.xumm_responses.findOne({ nft: nftId, payloadStatus: 'signed' })
            userWallet = xummResponses.payload.response.account
            xummAssociationOptions = { where: { id: xummResponses.id } }
        }

        let nft = await sails.models.nft_form.findOne({ "id": nftId }).populate('wallet')

        let X_ISSUER_WALLET_ADDRESS = nft.wallet.publicAddress;

        const nftCurrency = await sails.models.nft_currency.findOne({ nft: nftId, active: true })
        const { currency } = nftCurrency

        try {
            var delivered = await NFTService.deliver({
                X_BRAND_WALLET_ADDRESS,
                X_BRAND_SEED,
                X_USER_WALLET_ADDRESS: userWallet,
                currency,
                X_ISSUER_WALLET_ADDRESS
            });
        } catch(e){    
            throw e

        }


        if (delivered.engine_result !== "tesSUCCESS" || delivered.accepted !== true) {
            sails.log.error("NFT not delivered")
            res_obj.success = false;
            res_obj.badRequest = true;
            res_obj.data = delivered;
        
            if(delivered.engine_result_message){
                res_obj.message = delivered.engine_result_message;
                sails.log.error(delivered.engine_result_message);

            }


            return res_obj;
        }

        const updateNftStatusResponse = await NFTFormService.updateStatus('delivered', nftId)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";
            sails.log.error("NFT does not exist");

            return res_obj;
        }

        const nft_form_status = updateNftStatusResponse.nft_form_status

        const xrpl_tx = await sails.models.xrpl_transactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": delivered }).fetch();

        let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }
        let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx.id } }

        const nftPopulated = await sails.models.nft_form.findOne({ "id": nftId })
            .populate('status', statusAssociationOptions)
            .populate('xrpl_tx', xrplTransactionsAssociationOptions)
            .populate('xumm', xummAssociationOptions)
            // Deep/nested populate for status - NFT_Form_Status
            .then(generalService.populateNFTFormStatus())

        sails.sockets.blast('delivered', {
            nftId: nftId
        })
        sails.log.debug(`NFT has been delivered. nftId: ${nftId}`)

        res_obj.success = true
        res_obj.message = "NFT delivered successfully."
        res_obj.data = { nft: nftPopulated }

        return res_obj
    },
};
