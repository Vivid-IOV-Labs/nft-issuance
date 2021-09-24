/**
 * NftController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

require('dotenv').config();

// //Generate Wallets
const X_ISSUER_WALLET_ADDRESS = (process.env.X_ISSUER_WALLET_ADDRESS).toString();
const X_ISSUER_SEED = (process.env.X_ISSUER_SEED).toString();

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();

const _requestRes = async (_xresp, res) => {

    if (_xresp.error) {
        return res.serverError(_xresp);
    } else {
        return res.ok(_xresp);
    }
}

const txIsSuccess = (v) => v.engine_result === "tesSUCCESS";
const txIsAccepted = (v) => v.accepted === true;
const hasDbID = (v) => typeof v.id != "undefined";

const { XummSdk } = require('xumm-sdk');
const Sdk = new XummSdk((process.env.XUMM_API_KEY).toString(), (process.env.XUMM_API_SECRET).toString())


module.exports = {

    create: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        if (req.body.token_name.length > 40) {
            res_obj.success = false;
            res_obj.message = "token_name should have less than 40 characters";

            return res.badRequest(res_obj);
        }

        const created = await NFTService.create({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED })
        if (created.engine_result === "tesSUCCESS" && created.accepted === true) {

            const status_options = await sails.models.statusoptions.findOne({ name: "created" });

            const nft = await sails.models.nftform.create({ "details": req.body, "current_status": status_options.name }).fetch();

            const nft_form_status = await sails.models.nftformstatus.create({ "status_success": true, "nft": nft.id, "status": status_options.id }).fetch();

            const xrpl_tx = await sails.models.xrpltransactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": created }).fetch();

            let statusAssociationOptions = { where: { id: nft_form_status.id } }

            // TODO: Add else case if (!xrpl_tx.id) and return error. Repeat in all endpoints
            if (xrpl_tx.id) {
                let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx.id } }
                const nftPopulated = await sails.models.nftform.findOne({ "id": nft.id })
                    .populate('status', statusAssociationOptions)
                    .populate('xrpl_tx', xrplTransactionsAssociationOptions)
                    .populate('xumm');
                    //TODO: Remove populate('xumm') when empty

                res_obj.success = true
                res_obj.message = "NFT created successfully"
                res_obj.data = { nft: nftPopulated }
            }
        }

        return _requestRes(res_obj, res)

    },

    approve: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        const nft = await sails.models.nftform.findOne({ "id": req.body.id })
        const tokenName = nft.details.token_name
        const approved = await NFTService.approve({ X_BRAND_SEED, X_BRAND_WALLET_ADDRESS, tokenName });

        if (approved.engine_result === "tesSUCCESS" && approved.accepted === true) {
            const updateNftStatusResponse = await NFTFormService.updateStatus('approved', req.body.id)
            if (!updateNftStatusResponse.success) {
                res_obj.success = false;
                res_obj.message = "NFT does not exist";

                return res.badRequest(res_obj);
            }
            const nft_form_status = updateNftStatusResponse.nft_form_status
            const nft = updateNftStatusResponse.nft

            const xrpl_tx = await sails.models.xrpltransactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": approved }).fetch();

            let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }

            if (xrpl_tx.id) {
                let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx.id } }
                const nftPopulated = await sails.models.nftform.findOne({ "id": req.body.id })
                    .populate('status', statusAssociationOptions)
                    .populate('xrpl_tx', xrplTransactionsAssociationOptions)
                    .populate('xumm');

                res_obj.success = true
                res_obj.message = "NFT approved successfully"
                res_obj.data = { nft: nftPopulated }
            }

        } else {

            res_obj.success = false;
            res_obj.message = "Ripple Ledger 'TrustSet' transaction between 'Issuer' wallet and 'Brand' wallet failed";

            return res.badRequest(res_obj);


        }

        return _requestRes(res_obj, res)

    },

    issue: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        const issued = await NFTService.issue({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED }, { X_BRAND_WALLET_ADDRESS })

        //If the XRPL transactions where an array of transactions 
        if (Array.isArray(issued)) {
            let isSuccess = issued.every(txIsSuccess);
            let isAccepted = issued.every(txIsAccepted);

            console.log('isSuccess', isSuccess)
            console.log('isAccepted', isAccepted)

            if (isSuccess && isAccepted) {
                const updateNftStatusResponse = await NFTFormService.updateStatus('issued', req.body.id)
                if (!updateNftStatusResponse.success) {
                    res_obj.success = false;
                    res_obj.message = "NFT does not exist";

                    return res.badRequest(res_obj);
                }
                const nft_form_status = updateNftStatusResponse.nft_form_status
                const nft = updateNftStatusResponse.nft

                //As the XRPL transactions are an array, we should loop through each transaction result to record in the database.
                if (Array.isArray(issued)) {

                    const xrpl_tx_arr = [];

                    issued.forEach((item) => {

                        xrpl_tx_arr.push({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": item });

                    })

                    const xrpl_tx = await sails.models.xrpltransactions.createEach(xrpl_tx_arr).fetch();

                    let allEntriesHaveID = xrpl_tx.every(hasDbID);

                    if (allEntriesHaveID) {
                        let xrpl_tx_ids = xrpl_tx_arr.map(record => record.id)

                        let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }
                        let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx_ids } }

                        const nftPopulated = await sails.models.nftform.findOne({ "id": req.body.id })
                            .populate('status', statusAssociationOptions)
                            .populate('xrpl_tx', xrplTransactionsAssociationOptions)
                            .populate('xumm');

                        res_obj.success = true
                        res_obj.message = "NFT issued successfully"
                        res_obj.data = { nft: nftPopulated }
                    }
                    return res.ok(res_obj)
                }

            } else {

                res_obj.success = false;
                res_obj.message = "Ripple Ledger 'Payment' transaction to send NFT from 'Issuer' wallet to 'Brand' wallet failed";

                return res.badRequest(res_obj);

            }

        }

    },

    claim: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        //This is supposed to be done by the public users in the Xumm App.        

        // TODO: Should we use nftForm.locked value to determine whether it can be claimed or not? 
        // If so, no need to sort in claimNFTService._updateXummRecord
        // YES CHECK AND BLOCK

        //Prepare transaction payload for xumm users to sign and listen.
        const txTrustSet = await NFTService.txTrustSet()
        const claimCreatedDetails = await claimNFTService.listen(txTrustSet, req.body.id)

        const nft = await sails.models.nftform.findOne({ "id": req.body.id });
        const newXummRecord = {
            "nft": nft.id,
            "details": claimCreatedDetails
        }
        const xumm_api_payload = await sails.models.xumm.create(newXummRecord).fetch();

        if (!xumm_api_payload) {
            let message = `Could not claim NFT. id: ${req.body.id}`
            sails.log.error(message)
            res_obj.success = false
            res_obj.message = message

            return _requestRes(res_obj, res)
        }

        const updateNftStatusResponse = await NFTFormService.updateStatus('claimed', req.body.id)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res.badRequest(res_obj);
        }

        let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }
        let xummAssociationOptions = { where: { id: xumm_api_payload.id } }
   
        const nftPopulated = await sails.models.nftform.findOne({ "id": req.body.id })
            .populate('status', statusAssociationOptions)
            .populate('xumm', xummAssociationOptions)

        res_obj.success = true
        res_obj.message = "NFT claim payload generated successfully."
        res_obj.data = { nft: nftPopulated }

        return _requestRes(res_obj, res)
    },

    deliver: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        res_obj = await deliverNFTService.run(req.body.id, req.body.userWallet)

        return _requestRes(res_obj, res)

    },

    find: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        var request = req.allParams();

        let allNFT = null;
        let totalNFT = 0;
        var associationOptions = {
            where: {}
        }
        var NFTOptions = {
            where: {}
        }

        let sortBy = request.sortBy || 'createdAt'
        let order = request.order || 'asc'
        let pageSize = request.pageSize || 10
        let page = request.page || 1
        // TODO: filter by current_status=['delivered', 'issued', ...]

        allNFT = await sails.models.nftform.find()
            .where(NFTOptions.where)
            .populate('status', associationOptions)
            .populate('xrpl_tx', associationOptions)
            .populate('xumm', associationOptions)
            .populate('xummresponse', associationOptions)
            .sort(`${sortBy} ${order}`)
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .meta({ enableExperimentalDeepTargets: true })

        totalNFT = await sails.models.nftform.count()
            .where(NFTOptions.where)
            .meta({ enableExperimentalDeepTargets: true })


        res_obj.success = true
        res_obj.message = "List of NFTs"
        res_obj.data = { allNFT, totalNFT }


        return _requestRes(res_obj, res)

    }



};