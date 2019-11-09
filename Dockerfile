FROM ubuntu:18.04

# Create an unprivileged user
RUN groupadd rethinkdb \
  && useradd -g rethinkdb rethinkdb --shell /bin/bash -m -d /home/rethinkdb

# Install.
RUN \
  sed -i 's/# \(.*multiverse$\)/\1/g' /etc/apt/sources.list && \
  apt-get update && \
  apt-get -y upgrade && \
  apt-get install -y build-essential && \
  apt-get install -y software-properties-common && \
  apt-get install -y byobu curl git htop man unzip vim wget && \
  rm -rf /var/lib/apt/lists/*

# RethinkDB
RUN \
  echo "deb http://download.rethinkdb.com/apt `lsb_release -cs` main" > /etc/apt/sources.list.d/rethinkdb.list && \
  wget -O- http://download.rethinkdb.com/apt/pubkey.gpg | apt-key add - && \
  apt-get update && \
  apt-get install -y rethinkdb python-pip && \
  rm -rf /var/lib/apt/lists/*
RUN pip install rethinkdb==2.3.0

# NodeJS
# Allow user configuration of variable at build-time using --build-arg flag
ARG NODE_VERSION
# Initialize NODE_ENV and override with build-time flag, if set 
ENV NODE_VERSION ${NODE_VERSION:-10.15.3}
RUN \
  curl -O https://nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz && \
  tar xzf node-v$NODE_VERSION-linux-x64.tar.gz

ENV PATH="/node-v$NODE_VERSION-linux-x64/bin:${PATH}"

# Create directories
RUN mkdir -p /data

# Change ownership of the app to the unprivileged user
RUN chown rethinkdb:rethinkdb -R /data

WORKDIR /data
USER rethinkdb

# process cluster webui
EXPOSE 28015 29015 8080
EXPOSE 3000

CMD ["rethinkdb", "--bind", "all"]