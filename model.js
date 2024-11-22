import { model, Schema } from "mongoose";

const historySchema = new Schema(
  {
    user_id: {
      type: String,
      require: true,
    },
    pubkey: {
      type: String,
      require: true,
    },
    seckey: {
      type: String,
      require: true,
    },
    paid: {
      type: Boolean,
      default: false,
    },
    txn: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const History = model("historys", historySchema);
