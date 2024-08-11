const { Client } = require("discord.js");
const mongoose = require("mongoose");

module.exports = {
    name: "ready",
    once: true,
    rest: false,
    /**
     *
     * @param {Client} client
     */
    execute: async (client) => {
        try {
            await mongoose.connect(client.config.mongouri);
            client.log("✅ database connected.", "log");
        } catch (error) {
            throw error;
        }
    },
};
