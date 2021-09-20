var ObjectId = require('mongodb').ObjectId;

module.exports = {
    updateStatus: async (currentStatus, nftId) => {
        /* 
        Update current_status and previous_status in NFTForm table
        */
       
        var db = sails.getDatastore().manager;

        let res_obj = {
            success: false,
            message: ""
        };

        const status_options = await sails.models.statusoptions.findOne({ name: currentStatus });

        const nft = await sails.models.nftform.findOne({ "id": nftId });

        if (!nft) {
            res_obj.success = false;
            res_obj.message = "NFT does not exist";

            return res_obj;
        }
        res_obj.success = true

        const objectId = new ObjectId(nftId)

        const nftUpdated = await db.collection('nftform').findOneAndUpdate(
            { _id: objectId },
            {
                $set: {
                    "current_status": status_options.name,
                    "previous_status": nft.current_status
                }
            },
            { returnOriginal: false }
        );

        res_obj.nft_form_status = await sails.models.nftformstatus.create({ "status_success": true, "nft": nft.id, "status": status_options.id }).fetch();
        res_obj.nft = nft

        return res_obj
    }
}