import { Connection, PublicKey, clusterApiUrl, Keypair } from "@solana/web3.js";
import { History } from "./model.js";
import * as mongoose from "mongoose";
import TelegramBot from "node-telegram-bot-api";
const token = "7196196772:AAHbFouiLBOlekvDeMD5N6WKFTS_NLnkvYQ";
const bot = new TelegramBot(token, { polling: true });
const chatId = "-4594299422"; // or use the chat ID directly

mongoose
  .connect(
    "mongodb+srv://kei:djfeoaurro@cluster0.8fzfe.mongodb.net/telegram-bot-solana"
  )
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("Connection to MongoDB failed", error);
  });

// Function to create a one-time invite link
async function createInviteLink() {
  try {
    const inviteLink = await bot.createChatInviteLink(chatId, {
      name: "One-time Invite",
      expire_date: Math.floor(Date.now() / 1000) + 30 * 60, // Expire in 30 min
      member_limit: 1, // Limit to one user
      creates_join_request: false, // Set to true if admin approval is needed
    });

    console.log("Invite Link:", inviteLink.invite_link);

    return inviteLink.invite_link;
  } catch (error) {
    console.error("Error creating invite link:", error);
  }
}

async function createWallet(user_id) {
  const user = await History.findOne({ user_id: String(user_id) });
  if (!user) {
    // STEP 1: Generate a new wallet keypair
    const newPair = Keypair.generate();

    // STEP 2: Store the public and private keys
    const publicKey = newPair.publicKey.toString();
    const secretKey = newPair.secretKey.toString();

    const HistoryData = new History({
      user_id: String(user_id),
      pubkey: publicKey,
      seckey: secretKey,
      usageStatus: false,
    });

    await HistoryData.save();

    return { flag: 1, publicKey };
  } else if (user.paid === false) {
    return { flag: 2, publicKey: user.pubkey };
  } else if (user.paid === true) {
    return { flag: 3, publicKey: user.pubkey };
  }

  return false;
}

async function getWalletBalance(publicKey) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const balance = await connection.getBalance(new PublicKey(publicKey));
  return balance;
}

// Call the function to create the invite link
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  // Send the invite link and store the usage status
  bot.sendMessage(
    chatId,
    `You need to pay 0.1 sol to join our group.\n If you want continue, type /pay to get invite link`
  );

  // Optionally, set up a mechanism to revoke the link if possible
});

// Pre-generated invite link (from Telegram app)

bot.onText(/\/pay/, async (msg) => {
  const chatId = msg.chat.id;
  const check_result = await createWallet(chatId);

  if (check_result.flag === 1 || check_result.flag === 2) {
    bot.sendMessage(
      chatId,
      `Please send me your 0.1 SOL to the address: ${check_result.publicKey} to get invite link \n then Type /getlink to get your invite link`
    );
  } else if (check_result.flag === 3) {
    bot.sendMessage(
      chatId,
      "You have already paid for the invite link. You can use it now. \n Type /getlink to get your invite link"
    );
  } else if (!check_result) {
    bot.sendMessage(
      chatId,
      "server is not responding. Please try again later."
    );
  }
});

bot.onText(/\/getlink/, async (msg) => {
  const chatId = msg.chat.id;

  const check_result = await createWallet(chatId);

  console.log(check_result, "check_result");

  if (check_result.flag === 1) {
    bot.sendMessage(
      chatId,
      `Please send me your 0.1 SOL to the address: ${check_result.publicKey} to get invite link`
    );
  } else if (check_result.flag === 2) {
    bot.sendMessage(
      chatId,
      `Please wait, we are checking your wallet balance : ${check_result.publicKey}`
    );
    const balance = await getWalletBalance(check_result.publicKey);
    console.log(balance, "balance");
    if (balance >= 100000000) {
      await History.updateOne({ user_id: chatId }, { paid: true });
      const invitelink = await createInviteLink();
      bot.sendMessage(
        chatId,
        `Here is your invite link to join our group: ${invitelink}`
      );
    } else {
      bot.sendMessage(
        chatId,
        `Insufficient SOL balance : ${balance}. Please send more SOL to join our group.`
      );
    }
  } else if (check_result.flag === 3) {
    const invitelink = await createInviteLink();
    // Here add any verification or check for authorization
    bot.sendMessage(
      chatId,
      `Here is your invite link to join our group: ${invitelink}`
    );
  } else if (!check_result) {
    bot.sendMessage(
      chatId,
      "server is not responding. Please try again later."
    );
  }
});

console.log("Bot is up and running");

// Replace with your group chat ID or username
