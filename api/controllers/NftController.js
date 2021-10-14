/**
 * NftController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

require('dotenv').config();
let ObjectId = require('mongodb').ObjectId;
let db = sails.getDatastore().manager;

// //Generate Wallets
const X_ISSUER_WALLET_ADDRESS = (process.env.X_ISSUER_WALLET_ADDRESS).toString();
const X_ISSUER_SEED = (process.env.X_ISSUER_SEED).toString();

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();

const _requestRes = async (_xresp, res) => {

    if (_xresp.error) {
        sails.log.error(_xresp.message)
        return res.serverError(_xresp);
    } else if (_xresp.badRequest) {
        sails.log.info(_xresp.message)
        return res.badRequest(_xresp);
    } else if (_xresp.messageStatus === 'NFT_LOCKED') {
        sails.log.info(_xresp.message)
        res.status(405).send(_xresp)
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

        if (req.body.token_name.length > 38) {
            res_obj.success = false;
            res_obj.message = "token_name should not have more than 38 characters";

            return res.badRequest(res_obj);
        } else {
            let tokenName = req.body.token_name.padEnd(38, ' ')
            req.body.token_name = tokenName
            let tokenNameHex = await NFTService.textToHex({ text: tokenName })
            req.body.token_name_hex = '0x02' + tokenNameHex
        }

        const created = await NFTService.create({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED })
        if (created.engine_result === "tesSUCCESS" && created.accepted === true) {

            const nft_status_options = await sails.models.nft_status_options.findOne({ name: "created" });

            const nft = await sails.models.nft_form.create({ "details": req.body, "current_status": nft_status_options.name }).fetch();

            const nft_form_status = await sails.models.nft_form_status.create({ "status_success": true, "nft": nft.id, "status": nft_status_options.id }).fetch();

            const xrpl_tx = await sails.models.xrpl_transactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": created }).fetch();

            let statusAssociationOptions = { where: { id: nft_form_status.id } }

            if (!xrpl_tx.id) {
                res_obj.success = false
                res_obj.error = true
                res_obj.message = "Could not create NFT"

                return _requestRes(res_obj, res)
            }

            let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx.id } }
            const nftPopulated = await sails.models.nft_form.findOne({ "id": nft.id })
                .populate('status', statusAssociationOptions)
                .populate('xrpl_tx', xrplTransactionsAssociationOptions)

            res_obj.success = true
            res_obj.message = "NFT created successfully"
            res_obj.data = { nft: nftPopulated }
        }

        return _requestRes(res_obj, res)

    },

    approve: async function (req, res) {

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        const nft = await sails.models.nft_form.findOne({ "id": req.body.id })
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

            const xrpl_tx = await sails.models.xrpl_transactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": approved }).fetch();

            let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }

            if (!xrpl_tx.id) {
                res_obj.success = false
                res_obj.error = true
                res_obj.message = "Could not approve NFT"

                return _requestRes(res_obj, res)
            }

            let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx.id } }
            const nftPopulated = await sails.models.nft_form.findOne({ "id": req.body.id })
                .populate('status', statusAssociationOptions)
                .populate('xrpl_tx', xrplTransactionsAssociationOptions)

            res_obj.success = true
            res_obj.message = "NFT approved successfully"
            res_obj.data = { nft: nftPopulated }

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

        const nftForm = await NFT_Form.findOne({ id: req.body.id })
        if (nftForm.current_status !== 'approved') {
            res_obj.success = false;
            res_obj.message = "NFT has not been approved";

            return res.badRequest(res_obj);
        }

        const issued = await NFTService.issue({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED }, { X_BRAND_WALLET_ADDRESS })

        //If the XRPL transactions where an array of transactions 
        if (Array.isArray(issued)) {
            let isSuccess = issued.every(txIsSuccess);
            let isAccepted = issued.every(txIsAccepted);

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

                    const xrpl_tx = await sails.models.xrpl_transactions.createEach(xrpl_tx_arr).fetch();

                    let allEntriesHaveID = xrpl_tx.every(hasDbID);

                    if (!allEntriesHaveID) {
                        res_obj.success = false
                        res_obj.error = true
                        res_obj.message = "Could not issue NFT"

                        return _requestRes(res_obj, res)
                    }

                    let xrpl_tx_ids = xrpl_tx_arr.map(record => record.id)

                    let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }
                    let xrplTransactionsAssociationOptions = { where: { id: xrpl_tx_ids } }

                    const nftPopulated = await sails.models.nft_form.findOne({ "id": req.body.id })
                        .populate('status', statusAssociationOptions)
                        .populate('xrpl_tx', xrplTransactionsAssociationOptions)

                    res_obj.success = true
                    res_obj.message = "NFT issued successfully"
                    res_obj.data = { nft: nftPopulated }

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

        const nft = await sails.models.nft_form.findOne({ "id": req.body.id });
        if (nft.locked) {
            let message = `Could not claim NFT. NFT is locked. id: ${req.body.id}`
            sails.log.info(message)
            res_obj.success = false
            res_obj.message = message
            res_obj.messageStatus = 'NFT_LOCKED'

            return _requestRes(res_obj, res)
        }
        if (nft.current_status !== 'issued') {
            res_obj.success = false;
            res_obj.message = "NFT has not been issued";

            return res.badRequest(res_obj);
        }

        //Prepare transaction payload for xumm users to sign and listen.
        const txTrustSet = await NFTService.txTrustSet()
        const claimCreatedDetails = await claimNFTService.listen(txTrustSet, req.body.id)

        const newXummRecord = {
            "nft": nft.id,
            "details": claimCreatedDetails
        }
        const xumm_api_payload = await sails.models.xumm.create(newXummRecord).fetch();

        if (!xumm_api_payload) {
            res_obj.success = false
            res_obj.error = true
            res_obj.message = `Could not claim NFT. id: ${req.body.id}`

            return _requestRes(res_obj, res)
        }

        const updateNftStatusResponse = await NFTFormService.updateStatus('claiming', req.body.id)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res.badRequest(res_obj);
        }

        let statusAssociationOptions = { where: { id: updateNftStatusResponse.nft_form_status.id } }
        let xummAssociationOptions = { where: { id: xumm_api_payload.id } }

        const nftPopulated = await sails.models.nft_form.findOne({ "id": req.body.id })
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


        const xummResponse = await sails.models.xumm_responses.findOne({ nft: req.body.id, payloadStatus: 'signed' })
        const txBlob = xummResponse.payload.response.hex
        const verify = await verifyNFTService.run(req.body.id, txBlob, req.body.userWallet)

        if (!verify.success) return _requestRes(verify.res_obj, res)

        res_obj = await deliverNFTService.run(req.body.id, req.body.userWallet)

        return _requestRes(res_obj, res)
    },

    reject: async function (req, res) {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        const updateNftStatusResponse = await NFTFormService.updateStatus('rejected', req.body.id)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res.badRequest(res_obj);
        }
        res_obj.success = true
        res_obj.message = "NFT rejected successfully"
        res_obj.data = { nft: updateNftStatusResponse.nft }

        return _requestRes(res_obj, res)
    },

    findOne: async function (req, res) {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };
        var associationOptions = {
            where: {}
        }

        const id = req.param('id')
        if (!id) {
            res_obj.success = false
            res_obj.badRequest = true
            res_obj.message = `Path parameter not found. id is required.`

            return _requestRes(res_obj, res)
        }

        associationOptions.where.nft = id

        const nft = await sails.models.nft_form.findOne({ id: id })
            .populate('status', associationOptions)
            .populate('xrpl_tx', associationOptions)
            .populate('xumm', associationOptions)
            .populate('xumm_response', associationOptions)
            .meta({ enableExperimentalDeepTargets: true })

        res_obj.success = true
        res_obj.message = `NFT fetched. id: ${id}`
        res_obj.data = { nft }

        return _requestRes(res_obj, res)

    },

    find: async function (req, res) {
        /* 
          Get NFT records from database.
          Eg GET request: /nft
    
          Optional parameters:
            sortBy            (sort by a parameter of the nft_form record. Eg 'createdAt', 'details.title')
            order             ('asc', 'desc'. Default: asc)
            pageSize          (Number of items per page. Default: 10)
            page              (Number of page based on the pageSize. Default: 1)
            locked            (Filter by 'locked'. Eg 'true', 'false')
            status            (Filter by 'current_status'. Eg ["approved", "delivered"])
            id                (Filter by 'id'. Eg: 615cb190475bed782d3c19ff)
            
            Eg /nft?status=["approved", "delivered"]&id=615cb190475bed782d3c19ff&locked=true
        */

        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        let allNFT = null;
        let totalNFT = 0;
        var associationOptions = {
            where: {}
        }
        var NFTOptions = {
            where: {}
        }

        let sortBy = req.query.sortBy || 'createdAt'
        let order = req.query.order || 'asc'
        let pageSize = req.query.pageSize || 10
        let page = req.query.page || 1

        if (req.query.id) NFTOptions.where.id = req.query.id
        if (req.query.status) NFTOptions.where.current_status = JSON.parse(req.query.status)
        if (!!req.query.locked) NFTOptions.where.locked = req.query.locked

        allNFT = await sails.models.nft_form.find()
            .where(NFTOptions.where)
            .populate('status', associationOptions)
            .populate('xrpl_tx', associationOptions)
            .populate('xumm', associationOptions)
            .populate('xumm_response', associationOptions)
            .sort(`${sortBy} ${order}`)
            .skip((page - 1) * pageSize)
            .limit(pageSize)
            .meta({ enableExperimentalDeepTargets: true })

        totalNFT = await sails.models.nft_form.count()
            .where(NFTOptions.where)
            .meta({ enableExperimentalDeepTargets: true })

        res_obj.success = true
        res_obj.message = "List of NFTs"
        res_obj.data = { allNFT, totalNFT }

        return _requestRes(res_obj, res)
    },

    update: async function (req, res) {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        nft = await sails.models.nft_form.findOne({ id: req.query.id })
        if (!((nft.current_status === 'created') || (nft.current_status === 'rejected' && nft.previous_status === 'created'))) {
            res_obj.success = false
            res_obj.badRequest = true
            res_obj.message = `Could not update NFT. Can only update NFT (if current_status === 'created') OR ` +
                `(if current_status === 'rejected' AND previous_status === 'created'). id: ${req.query.id}`
            res_obj.data = { nft }

            return _requestRes(res_obj, res)
        }

        const allowedToBeChanged = [
            'details.token_name',
            'details.title',
            'details.subtitle',
            'details.description',
            'details.tags',
            'details.media_url',
            'details.categories',
            'details.brand_name',
            'details.transferable_copyright',
        ]
        const isRequestBodyParamsAccepted = Object.keys(req.body).every(param => allowedToBeChanged.includes(param))
        if (!isRequestBodyParamsAccepted) {
            res_obj.success = false
            res_obj.badRequest = true
            res_obj.message = `Wrong body parameters. These parameters are allowed: ${allowedToBeChanged}`

            return _requestRes(res_obj, res)
        }

        let reqTokenName = req.body['details.token_name']
        if (reqTokenName !== undefined) {
            if (reqTokenName.length > 38) {
                res_obj.success = false;
                res_obj.message = "token_name should not have more than 38 characters";

                return res.badRequest(res_obj);
            } else {
                let tokenName = reqTokenName.padEnd(38, ' ')
                req.body["details.token_name"] = tokenName
                let tokenNameHex = await NFTService.textToHex({ text: tokenName })
                req.body["details.token_name_hex"] = '0x02' + tokenNameHex
            }
        }

        const objectId = new ObjectId(req.query.id)
        const nftUpdateValues = {
            $set: req.body
        }
        const nftUpdated = await db.collection('nft_form').findOneAndUpdate(
            { _id: objectId },
            nftUpdateValues,
            { returnOriginal: false });

        if (!nftUpdated.lastErrorObject.updatedExisting) {
            res_obj.success = false
            res_obj.error = true
            res_obj.message = `Could not update nft. id: ${req.query.id}`

            return _requestRes(res_obj, res)
        }

        res_obj.success = true
        res_obj.message = `NFT updated successfully. id: ${req.query.id}`
        res_obj.data = { nft: nftUpdated.value }

        return _requestRes(res_obj, res)
    },

    delete: async function (req, res) {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };
        var associationOptions = {
            where: {}
        }
        try {
            var ids = JSON.parse(req.query.id)
        } catch (error) {
            let message = `id should not contain single quotes (''). Instead it should be a string like this: 
                ["6156ca1ae406350fe66059fa", "6156ca1ae406350fe66059fv"]`
            res_obj.success = false
            res_obj.badRequest = true
            res_obj.message = message

            return _requestRes(res_obj, res)
        }

        associationOptions.where.nft = ids

        const allNFT = await sails.models.nft_form.findOne({ id: ids })
            .populate('status', associationOptions)
            .populate('xrpl_tx', associationOptions)
            .populate('xumm', associationOptions)
            .populate('xumm_response', associationOptions)
            .meta({ enableExperimentalDeepTargets: true })

        await sails.models.nft_form.archive({ id: ids })
        await sails.models.nft_form_status.archive({ nft: ids })
        await sails.models.xrpl_transactions.archive({ nft: ids })
        await sails.models.xumm.archive({ nft: ids })
        await sails.models.xumm_responses.archive({ nft: ids })
        await sails.models.nft_claim_verification.archive({ nft: ids })

        res_obj.success = true
        res_obj.message = "All NFT has been deleted."
        res_obj.data = { nft: allNFT }

        return _requestRes(res_obj, res)
    }
};