var ObjectId = require('mongodb').ObjectId;

module.exports = {
    updateStatus: async (currentStatus, nftId) => {
        /* 
            Update current_status and previous_status in NFT_Form table
        */

        var db = sails.getDatastore().manager;

        let res_obj = {
            success: false,
            message: ""
        };

        const nft_status_options = await sails.models.nft_status_options.findOne({ name: currentStatus });

        const nft = await sails.models.nft_form.findOne({ "id": nftId });

        if (!nft) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res_obj;
        }
        res_obj.success = true

        const objectId = new ObjectId(nftId)

        const nftUpdated = await db.collection('nft_form').findOneAndUpdate(
            { _id: objectId },
            {
                $set: {
                    "current_status": nft_status_options.name,
                    "previous_status": nft.current_status
                }
            },
            { returnOriginal: false }
        );

        res_obj.nft_form_status = await sails.models.nft_form_status.create({ "status_success": true, "nft": nft.id, "status": nft_status_options.id }).fetch();
        res_obj.nft = nftUpdated.value

        return res_obj
    },

    revertStatus: async (nftId) => {
        /* 
            Revert current_status to previous_status in NFT_Form table
        */

        let res_obj = {
            success: false,
            message: ""
        };

        const nft = await sails.models.nft_form.findOne({ id: nftId });
        if (!nft) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res_obj;
        }

        return module.exports.updateStatus(nft.previous_status, nftId)
    }
}