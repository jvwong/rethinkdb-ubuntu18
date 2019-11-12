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

# NodeJS
ARG NODE_VERSION

ENV NODE_VERSION ${NODE_VERSION:-10.15.3}

RUN \
  curl -O https://nodejs.org/download/release/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz && \
  tar xzf node-v$NODE_VERSION-linux-x64.tar.gz

ENV PATH="/node-v$NODE_VERSION-linux-x64/bin:${PATH}"

# Create app directory
RUN mkdir -p /home/rethinkdb/app
WORKDIR /home/rethinkdb/app

# Copy in source code
COPY . /home/rethinkdb/app

# Install app dependencies
# Note: NODE_ENV is development so that dev deps are installed
RUN NODE_ENV=development npm install

# Change ownership of the app to the unprivileged user
RUN chown rethinkdb:rethinkdb -R /home/rethinkdb/app

EXPOSE 3000

# RethinkDB
RUN \
  echo "deb http://download.rethinkdb.com/apt `lsb_release -cs` main" > /etc/apt/sources.list.d/rethinkdb.list && \
  wget -O- http://download.rethinkdb.com/apt/pubkey.gpg | apt-key add - && \
  apt-get update && \
  apt-get install -y rethinkdb python-pip && \
  rm -rf /var/lib/apt/lists/*

# python v2.7.15
RUN pip install rethinkdb==2.3.0 

# Create directories
RUN mkdir -p /data

RUN chown rethinkdb:rethinkdb -R /data

WORKDIR /home/rethinkdb/app

USER rethinkdb

# process cluster webui
EXPOSE 28015 29015 8080

COPY entrypoint.sh /

CMD ["/entrypoint.sh"]