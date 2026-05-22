import StoreManagement from "../models/storeManagement.js";

const addStore = async (req, res) => {
  try {
    const { storeName } = req.body; // ✅ extract from body

    if (!storeName) {
      return res.status(400).json({
        msg: "storeName is required",
      });
    }

    const existStore = await StoreManagement.findOne({ storeName });

    if (existStore) {
      return res.status(400).json({
        msg: "Store is already registered",
      });
    }

    const createStore = await StoreManagement.create(req.body);

    res.status(201).json({
      msg: "Store details added successfully",
      createStore,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      msg: err.message,
    });
  }
};

const getAllStores = async (req, res) => {
  try {
    const getStoresDetails = await StoreManagement.find();
    res.status(200).json({
      msg: "store details fetched successfully",
      data:getStoresDetails,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      msg: err.message,
    });
  }
};

const getEachStore = async (req,res) =>{
    try{
        const id = req.params.id
        const isStore = await StoreManagement.findById(id)
        if(isStore){
        res.status(200).json({
            msg:'the details of certain store fetched successfully',
            data:isStore
        })
    } res.status(404).json({
        msg:"invalid id or id not found"
    })
    }
    catch (err) {
    console.error(err);

    res.status(500).json({
      msg: err.message,
    });
  }
}

const editStoreDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedStore = await StoreManagement.findByIdAndUpdate(
      id,
      req.body,           // ✅ data to update
      { new: true }       // ✅ return updated document
    );

    if (!updatedStore) {
      return res.status(404).json({
        msg: "Invalid ID or store not found",
      });
    }

    res.status(200).json({
      msg: "Store details updated successfully",
      updatedStore,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message,
    });
  }
};

const deleteStoreDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteStore = await StoreManagement.findByIdAndDelete(id);

    if (!deleteStore) {
      return res.status(404).json({
        msg: "Invalid ID or store not found",
      });
    }

    res.status(200).json({
      msg: "Store details deleted successfully",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: err.message,
    });
  }
};

export { addStore,getAllStores,getEachStore,editStoreDetails,deleteStoreDetails };
