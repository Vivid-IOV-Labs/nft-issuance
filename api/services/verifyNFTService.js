const verifySignature = require('verify-xrpl-signature').verifySignature

module.exports = {
    run: async (nftId, txBlob, receiver) => {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        const verify = verifySignature(txBlob)
        
        // TODO: Do we need the receiver/issuer (issuer == X_BRAND_WALLET_ADDRESS)?
        // if (verify.signedBy === receiver && verify.signatureValid) {
        if (verify.signatureValid) {
            sails.sockets.blast('verified', {
                nftId: nftId
            })
    
            res_obj.success = true
            res_obj.message = "NFT delivery has been verified"
            
            return res_obj
        }

        res_obj.success = false;
        res_obj.message = "Could not verify NFT delivery";

        return res_obj
    },
};
