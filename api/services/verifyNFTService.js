const verifySignature = require('verify-xrpl-signature').verifySignature

module.exports = {
    run: async (nftId, txBlob, receiver) => {
        let res_obj = {
            success: false,
            message: "",
            data: {}
        };

        const verify = verifySignature(txBlob)

        const nftClaimVerificationNewRecord = {
            nft: nftId,
            verification: verify
        }
        await sails.models.nft_claim_verification.create(nftClaimVerificationNewRecord)
    
        if (verify.signedBy === receiver && verify.signatureValid) {    
            res_obj.success = true
            res_obj.message = "NFT claim has been verified"
            
            return res_obj
        }

        NFTFormService.updateStatus('issued', nftId)
        sails.sockets.blast('unverified', {
            nftId: nftId
        })

        res_obj.success = false;
        res_obj.message = "Could not verify NFT claim";
        sails.log.error(res_obj.message)
        
        return res_obj
    },
};
