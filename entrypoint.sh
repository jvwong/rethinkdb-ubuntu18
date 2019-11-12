#!/bin/bash
cd /data && rethinkdb --bind all &
cd /home/rethinkdb/app && npm run start 