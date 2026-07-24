# Self-Hosting Guide

AntCapture is built to be self-hostable. By self-hosting the open-source version of the server, you unlock advanced dashboard functionality for free!

## How it Works
When self-hosting, the Chrome extension connects directly to your own infrastructure instead of our official Cloud API.

1. **Clone the Public Repository:**
   Download the AntCapture open-source repo containing the Extension, Web UI, and Base Server.
2. **Start the Base Server:**
   The open-source server handles media storage, basic authentication, and database management using SQLite or PostgreSQL. 
3. **Configure the Extension:**
   Update your extension configuration to point to your self-hosted server IP or domain instead of the default cloud domain.

Self-hosting gives you **100% data privacy** and unlimited storage based on your own hard drive or personal buckets, entirely bypassing premium Cloud limitations!
