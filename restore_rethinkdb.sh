#!/bin/bash

# NAME
#   restore_rethinkdb
#
# SYNOPSIS:
#   restore_rethinkdb.sh -c container -i import -f file
#
# DESCRIPTION:
#   Restore data within Rethinkdb Docker container from archive. 
#   Assume
#    - host and client port of the node to connect to is 'localhost:28015'
#    - no password
#    - overwrite any exists database/table
#    - Working directory of container is '/data'
#   Used with Docker version 18.09.6
#
#   -c container (required)
#     The container name 
#   -i import 
#     Limit the dump to the given database and/or table; Use dot notation e.g. 'test.authors'
#   -f file 
#     Input archive path on host

################################# VARS #################################
RETHINKDB_DATA_DIRECTORY='/data'
################################# OPTS #################################
cval=
ival=
fval=
while getopts 'c:i:f:' OPTION
do
  case $OPTION in
    c)  cval=1
        CONTAINER_NAME="$OPTARG"
        if ! docker container ls --format ‘{{.Names}}’ | grep -wq "${CONTAINER_NAME}"; then
          printf 'Option -n "%s" is not a container\n' "${CONTAINER_NAME}"
          exit 2
        fi
        ;;

    i)  ival=1
        DB_TABLE="$OPTARG"
        if [ ! "$ival" ]; then
          printf 'Option -i "%s" is required\n' "$oval"
          exit 2
        fi
        ;;
        
    f)  fval=1
        ARCHIVE_INPUT_PATH="$OPTARG"
        if [ ! -f "${ARCHIVE_INPUT_PATH}" ]; then
          printf 'Option -f "%s" is not a file\n' ${ARCHIVE_INPUT_PATH}
          exit 2
        fi
        CONTAINER_ARCHIVE_PATH=${RETHINKDB_DATA_DIRECTORY}/$(basename ${ARCHIVE_INPUT_PATH})
        ;;

    ?)  printf "Usage: %s -c container -i import -f file\n" $0 >&2
        exit 2
        ;; 

  esac
done


################################ RESTORE #################################
# Restore from gzip archive 
if [ "$cval" -a "$ival" -a "$fval" ]; then
  docker cp ${ARCHIVE_INPUT_PATH} ${CONTAINER_NAME}:${RETHINKDB_DATA_DIRECTORY}
  docker exec -it ${CONTAINER_NAME} /bin/bash -c "rethinkdb restore ${CONTAINER_ARCHIVE_PATH} -i ${DB_TABLE} --force"
  docker exec -it ${CONTAINER_NAME} /bin/bash -c "rm -rf ${CONTAINER_ARCHIVE_PATH}"
else 
  printf "Usage: %s -c container -i import -f file\n" $0 >&2
  exit 2
fi