#!/bin/bash

# NAME
#   dump_rethinkdb
#
# SYNOPSIS:
#   dump_rethinkdb.sh -c container -e export -n name -f file 
#
# DESCRIPTION:
#   Dump data within Rethinkdb Docker container to archive. Assume that dump happens in /data.
#   Used with Docker version 18.09.6
#   -c container (required)
#     The container name 
#   -e export 
#     Limit the dump to the given database and/or table; Use dot notation e.g. 'test.authors'
#   -n name (optional)
#     The dump archive name; .tar.gz will be appended
#   -f file (optional)
#     Output to the specified host path

################################# VARS #################################
TIMESTAMP=`date "+%Y%m%d_%H%M%S"`
ARCHIVE_OUTPUT_DIRECTORY=$(pwd)
RETHINKDB_DATA_DIRECTORY='/data'
DUMP_ARCHIVE_NAME=rethinkdb_dump_${TIMESTAMP}.tar.gz
################################# OPTS #################################
cval=
eval=
nval=
fval=
while getopts 'c:e:n:f:' OPTION
do
  case $OPTION in
    c)  cval=1
        CONTAINER_NAME="$OPTARG"
        if ! docker container ls --format ‘{{.Names}}’ | grep -wq "${CONTAINER_NAME}"; then
          printf 'Option -n "%s" is not a container\n' "${CONTAINER_NAME}"
          exit 2
        fi
        ;;

    e)  eval=1
        DB_TABLE="$OPTARG"
        if [ ! "$eval" ]; then
          printf 'Option -e "%s" is required\n' "$oval"
          exit 2
        fi
        ;;
        
    n)  nval=1
        DUMP_ARCHIVE_NAME="$OPTARG".tar.gz
        ;;

    f)  fval=1
        ARCHIVE_OUTPUT_DIRECTORY="$OPTARG"
        if [ ! -d "${ARCHIVE_OUTPUT_DIRECTORY}" ]; then
          printf 'Option -f "%s" is not a directory\n' ${ARCHIVE_OUTPUT_DIRECTORY}
          exit 2
        fi
        ;;

    ?)  printf "Usage: %s -c container -e export [-n name] [-f file]\n" $0 >&2
        exit 2
        ;; 

  esac
done


################################ BACKUP #################################
if [ "$cval" -a "$eval" ]; then
  docker exec -it ${CONTAINER_NAME} /bin/bash -c "rethinkdb dump -e ${DB_TABLE} -f ${DUMP_ARCHIVE_NAME}"
  docker cp ${CONTAINER_NAME}:${RETHINKDB_DATA_DIRECTORY}/${DUMP_ARCHIVE_NAME} ${ARCHIVE_OUTPUT_DIRECTORY}
  docker exec -it ${CONTAINER_NAME} /bin/bash -c "rm ${RETHINKDB_DATA_DIRECTORY}/${DUMP_ARCHIVE_NAME}"  
else 
  printf "Usage: %s -c container -e export [-n name] [-f file]\n" $0 >&2
  exit 2
fi