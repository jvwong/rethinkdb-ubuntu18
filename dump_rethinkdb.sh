#!/bin/bash

# NAME
#   dump_rethinkdb
#
# SYNOPSIS:
#   dump_rethinkdb.sh -n name -e export -f file 
#
# DESCRIPTION:
#   Dump data within Rethinkdb Docker container to archive. Assume that dump happens in /data.
#   Used with Docker version 18.09.6
#   -n name (required)
#     The name of the container
#   -e export 
#     Limit the dump to the given database and/or table; Use dot notation e.g. 'test.authors'
#   -f file (optional)
#     Output to the specified host path

################################# VARS #################################
TIMESTAMP=`date "+%Y%m%d_%H%M%S"`
ARCHIVE_OUTPUT_DIRECTORY=$(pwd)
RETHINKDB_DATA_DIRECTORY='/data'
################################# OPTS #################################
nflag=
eflag=
fflag=
while getopts 'n:e:f:' OPTION
do
  case $OPTION in
    n)  nflag=1
        CONTAINER_NAME="$OPTARG"
        if ! docker container ls --format ‘{{.Names}}’ | grep -wq "${CONTAINER_NAME}"; then
          printf 'Option -n "%s" is not a container\n' "${CONTAINER_NAME}"
          exit 2
        fi
        DUMP_ARCHIVE_NAME=${CONTAINER_NAME}_dump_${TIMESTAMP}.tar.gz
        ;;

    e)  eflag=1
        DB_TABLE="$OPTARG"
        ;;
        
    f)  fflag=1
        ARCHIVE_OUTPUT_DIRECTORY="$OPTARG"
        if [ ! -d "${ARCHIVE_OUTPUT_DIRECTORY}" ]; then
          printf 'Option -f "%s" is not a directory\n' ${ARCHIVE_OUTPUT_DIRECTORY}
          exit 2
        fi
        ;;

    ?)  printf "Usage: %s -n name -e export [-f file]\n" $0 >&2
        exit 2
        ;; 

  esac
done


################################ BACKUP #################################
# Create gzip archives from data in volumes 
if [ "$nflag" -a "$eflag" ]; then
  docker exec -it ${CONTAINER_NAME} /bin/bash -c "rethinkdb dump -e ${DB_TABLE} -f ${DUMP_ARCHIVE_NAME}"
  docker cp ${CONTAINER_NAME}:${RETHINKDB_DATA_DIRECTORY}/${DUMP_ARCHIVE_NAME} ${ARCHIVE_OUTPUT_DIRECTORY}
  docker exec -it ${CONTAINER_NAME} /bin/bash -c "rm ${RETHINKDB_DATA_DIRECTORY}/${DUMP_ARCHIVE_NAME}"  
else 
  printf "Usage: %s -n name -e export [-f file]\n" $0 >&2
  exit 2
fi