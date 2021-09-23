/**
 * NftController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

require('dotenv').config();

//Generate Wallets
const X_ISSUER_WALLET_ADDRESS = (process.env.X_ISSUER_WALLET_ADDRESS).toString();
const X_ISSUER_SEED = (process.env.X_ISSUER_SEED).toString();

const X_BRAND_WALLET_ADDRESS = (process.env.X_BRAND_WALLET_ADDRESS).toString();
const X_BRAND_SEED = (process.env.X_BRAND_SEED).toString();

// const X_USER_WALLET_ADDRESS = (process.env.X_USER_WALLET_ADDRESS).toString();
// const X_USER_SEED = (process.env.X_USER_SEED).toString();

let seqCount = 0;

const textToHex = (_o) => {
    return new Buffer.from(_o.text).toString('hex').toUpperCase();
}

const DOMAIN = "http://";
const NFTDOMAIN = textToHex({ text: DOMAIN });

const DOMAINVALUE = "xnft.peerkat.live   ";
const CURRENCY = textToHex({ text: DOMAINVALUE });

const X_url = 'wss://s.altnet.rippletest.net:51233';

const { XrplClient } = require('xrpl-client');

const xrpClient = new XrplClient(X_url);

const lib = require('xrpl-accountlib');


let txList = [{
    "TransactionType": "AccountSet",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "SetFlag": 8,
    "Domain": NFTDOMAIN
}, {
    "TransactionType": "TrustSet",
    "Account": "rReceivingHotWallet...",
    "Flags": 131072,
    "LimitAmount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
},
{
    "TransactionType": "Payment",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Destination": "rReceivingHotWallet...",
    "Amount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}, {
    "TransactionType": "SetRegularKey",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Fee": "12",
    "RegularKey": "rrrrrrrrrrrrrrrrrrrrBZbvji"
}, {
    "TransactionType": "AccountSet",
    "Account": X_ISSUER_WALLET_ADDRESS,
    "Fee": "12",
    "SetFlag": 4
}, {
    "TransactionType": "TrustSet",
    //"Account": "rFriendToReceiveNFT...",
    "Flags": 131072,
    "LimitAmount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}, {
    "TransactionType": "Payment",
    "Account": "rReceivingHotWallet...",
    "Destination": "rFriendToReceiveNFT...",
    "Amount": {
        "currency": CURRENCY,
        "issuer": X_ISSUER_WALLET_ADDRESS,
        "value": "1000000000000000e-96"
    }
}]


const _getaccountinfo = async (X_WALLET_ADDRESS) => {
    try {
        const resp = await xrpClient.send({ 'command': 'account_info', 'account': X_WALLET_ADDRESS, 'ledger': 'validated' });
        return resp;

    } catch (e) {
        return e;

    }

}

const _getfee = async () => {
    try {
        const resp = await xrpClient.send({ 'command': 'fee' });
        return resp;

    } catch (e) {
        return e;

    }

}

const _sendTx = async (_o) => {
    try {
        const resp = await xrpClient.send(_o);
        return resp;

    } catch (e) {
        return e;

    }

}

const _getAccountInfoAndFee = async (X_WALLET_ADDRESS) => {

    const x_acountinfo = await _getaccountinfo(X_WALLET_ADDRESS);
    const x_fee = await _getfee();
    const fee = (parseFloat(x_fee.drops.base_fee) * 1000000).toFixed(0) + "";

    x_acountinfo.account_data.Sequence += seqCount;

    return { accountInfo: x_acountinfo, feeInfo: x_fee, feeValue: fee }

}

const _signTx = async (_o) => {
    return lib.sign(_o.tx, _o.xaccount);

}

const _getXAccount = async (X_WALLET_SEED) => {
    return lib.derive.familySeed(X_WALLET_SEED);

}

const _requestRes = async (_xresp, res) => {

    if (_xresp.error) {
        return res.serverError(_xresp);
    } else {
        return res.ok(_xresp);
    }
}


const createTrustReceiverAndIssuer = async (_o) => {
    //Create trust-line brand wallet <-> issuer wallet

    const txInfo = await _getAccountInfoAndFee(_o.X_BRAND_WALLET_ADDRESS);

    txList[1].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[1].Fee = txInfo.feeValue;
    txList[1].Account = _o.X_BRAND_WALLET_ADDRESS;

    const xaccount = await _getXAccount(_o.X_BRAND_SEED);

    const txObj = await _signTx({ tx: txList[1], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}


const issueNFToken = async (_o, _p) => {
    //Issue NFToken send to brand wallet

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[2].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[2].Destination = _p.X_BRAND_WALLET_ADDRESS;
    txList[2].Fee = txInfo.feeValue;//fee;

    const txObj = await _signTx({ tx: txList[2], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const blackholeSetRegKey = async (_o) => {
    //Blackhole issuer wallet - set regular key

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[3].Sequence = txInfo.accountInfo.account_data.Sequence;

    const txObj = await _signTx({ tx: txList[3], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const blackholeDisableMasterKey = async (_o) => {
    //Blackhole issuer wallet - disable master key

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[4].Sequence = txInfo.accountInfo.account_data.Sequence;

    const txObj = await _signTx({ tx: txList[4], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const createTrustUserAndIssuer = async (_o) => {
    //Create trust-line user wallet <-> issuer wallet.

    const txInfo = await _getAccountInfoAndFee(_o.X_USER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_USER_SEED);

    txList[5].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[5].Account = _o.X_USER_WALLET_ADDRESS;
    txList[5].Fee = txInfo.feeValue;

    const txObj = await _signTx({ tx: txList[5], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}


const sendNFTokenToUser = async (_o) => {
    //Sends NFToken to user wallet.

    const txInfo = await _getAccountInfoAndFee(_o.X_BRAND_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_BRAND_SEED);

    txList[6].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[6].Account = _o.X_BRAND_WALLET_ADDRESS;
    txList[6].Destination = _o.X_USER_WALLET_ADDRESS;
    txList[6].Fee = txInfo.feeValue;

    const txObj = await _signTx({ tx: txList[6], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const accountSet = async (_o) => {
    //Account setup

    const txInfo = await _getAccountInfoAndFee(_o.X_ISSUER_WALLET_ADDRESS);
    const xaccount = await _getXAccount(_o.X_ISSUER_SEED);

    txList[0].Sequence = txInfo.accountInfo.account_data.Sequence;
    txList[0].Fee = txInfo.feeValue;

    const txObj = await _signTx({ tx: txList[0], xaccount: xaccount });

    const xresp = await _sendTx({ command: 'submit', "tx_blob": txObj.signedTransaction });

    return xresp;

}

const issueAndBlackhole = async (_o, _p) => {

    const arr = [];

    arr.push(await issueNFToken(_o, _p));

    seqCount++;
    arr.push(await blackholeSetRegKey(_o));

    seqCount++;
    arr.push(await blackholeDisableMasterKey(_o));
    seqCount = 0;

    return arr;

}

const create = async (_o) => {
    //Done by a brand worker

    const accountSetResponse = await accountSet(_o);

    return accountSetResponse;

}

const approve = async (_o) => {
    //Done by a brand manager

    const createdTrustReceiverAndIssuer = await createTrustReceiverAndIssuer(_o);

    return createdTrustReceiverAndIssuer;

}

const issue = async (_o, _p) => {
    //Done by a peerkat admin worker

    const issueAndBlackholeResponse = await issueAndBlackhole(_o, _p)

    return issueAndBlackholeResponse;

}

const claim = async (_o) => {
    //Done by a public user (via xumm app)

    const createdTrustUserAndIssuer = await createTrustUserAndIssuer(_o);

    return createdTrustUserAndIssuer;

}

const deliver = async (_o) => {
    //Done by an peerkat admin user or done automatically 

    const sendNFTokenToUserResponse = await sendNFTokenToUser(_o);

    return sendNFTokenToUserResponse;

}


var db = sails.getDatastore().manager;
var ObjectId = require('mongodb').ObjectId;

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

        var request = req.allParams();

        const created = await create({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED })
        console.log(created.engine_result)
        if (created.engine_result === "tesSUCCESS" && created.accepted === true) {

            const status_options = await sails.models.statusoptions.findOne({ name: "created" });

            const nft = await sails.models.nftform.create({ "details": request, "current_status": status_options.name }).fetch();

            const nft_form_status = await sails.models.nftformstatus.create({ "status_success": true, "nft": nft.id, "status": status_options.id }).fetch();

            const xrpl_tx = await sails.models.xrpltransactions.create({ "nft": nft.id, "nft_status": nft_form_status.id, "tx_details": created }).fetch();

            if (xrpl_tx.id) {
                res_obj.success = true
                res_obj.message = "NFT created successfully"
                res_obj.data = { nft, xrpl_tx }
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

        const approved = await approve({ X_BRAND_SEED, X_BRAND_WALLET_ADDRESS });

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

            if (xrpl_tx.id) {
                res_obj.success = true
                res_obj.message = "NFT approved successfully"
                res_obj.data = { nft: nft.value, xrpl_tx }
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

        let request = req.allParams();

        const issued = await issue({ X_ISSUER_WALLET_ADDRESS, X_ISSUER_SEED }, { X_BRAND_WALLET_ADDRESS })

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

                    console.log(allEntriesHaveID);

                    if (allEntriesHaveID) {
                        res_obj.success = true
                        res_obj.message = "NFT issued successfully"
                        res_obj.data = { nft: nft.value, xrpl_tx }

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

        //Prepare transaction payload for xumm users to sign and listen.
        const claimCreatedDetails = await claimNFTService.listen(txList[5], req.body.id)

        const nft = await sails.models.nftform.findOne({ "id": req.body.id });
        const newXummRecord = {
            "nft": nft.id,
            "xumm_api_status": true, // TODO: What should the price be? Boolean?
            "details": claimCreatedDetails
        }
        const xumm_api_payload = await sails.models.xumm.create(newXummRecord).fetch();

        if (!xumm_api_payload) {
            let message = `Could not claim NFT. nft.id: ${nft.id}`
            sails.log.error(message)
            res_obj.success = false
            res_obj.message = message

            return _requestRes(res_obj, res)
        }

        await NFTFormService.updateStatus('claimed', req.body.id)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res.badRequest(res_obj);
        }


        res_obj.success = true
        res_obj.message = "NFT claim payload generated successfully."
        res_obj.data = { nft, xumm_api_payload }

        return _requestRes(res_obj, res)
    },

    deliver: async function (req, res) {

        // // We dont need to call deliver function here, add to claim
        const delivered = await deliver({ X_BRAND_WALLET_ADDRESS, X_BRAND_SEED, X_USER_WALLET_ADDRESS: req.body.userWallet }); //Get X_USER_WALLET_ADDRESS from XUMM event

        NFTFormService.updateStatus('delivered', req.body.id)
        if (!updateNftStatusResponse.success) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res.badRequest(res_obj);
        }

        sails.sockets.blast('delivered', {
            nftId: req.body.id
        })

        return _requestRes(delivered, res)

    },

    find: async function (req, res) {

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

        allNFT = await sails.models.nftform.find()
            .where(NFTOptions.where)
            .populate('xumm', associationOptions)
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

    },

    update: async function (req, res) {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };
        
        console.log('here')
        nft = await sails.models.nftform.findOne({ id: req.query.id })
        const allowedToBeChanged = [
            'details.token_name',
            'details.url'
        ]
        
        console.log(req.body)
        console.log(Object.keys(req.body).every(allowedToBeChanged))
        // if (body.every(allowedToBeChanged))
        
        res.ok()
        return
        
        const nftUpdateValues = {
            $set: {
                "balanceAvailable": balanceAvailable
            }
        }
        const mediaUpdated = await db.collection('media').findOneAndUpdate(
            { mediaID: media.mediaID },
            mediaUpdateValues,
            { returnOriginal: false });

        if (!mediaUpdated.lastErrorObject.updatedExisting) {
            let message = `Could not update media. mediaID: ${media.mediaID}`
            sails.log.error(message);
            res.serverError({
                success: false,
                message: message,
                data: {}
            })
            return false
        }


    }
};