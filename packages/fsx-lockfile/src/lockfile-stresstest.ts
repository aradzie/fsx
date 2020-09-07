import { File } from "@aradzie/fsx-file";
import { exponentialDelay, RetryOptions } from "@aradzie/retry";
import cluster from "cluster";
import { LockFile } from "./lockfile.js";
import { pause } from "./pause.js";

const file = new File("/tmp/lock-file-stress-test.json");

start()
  .catch((err) => {
    console.error(`Process ${process.pid} failed`);
    console.error(err);
  })
  .finally(() => {
    // eslint-disable-next-line no-process-exit
    process.exit();
  });

async function start(): Promise<void> {
  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    await file.delete();
    await LockFile.forceUnlock(file);

    return master();
  } else {
    console.log(`Worker ${process.pid} started`);

    return worker();
  }
}

async function master(numWorkers = 8): Promise<void> {
  return new Promise((resolve) => {
    for (let i = 0; i < numWorkers; i++) {
      cluster.fork();
    }

    let remaining = numWorkers;

    cluster.on("exit", (worker) => {
      console.log(`Worker ${worker.process.pid} died`);

      remaining -= 1;

      if (remaining === 0) {
        resolve();
      }
    });
  });
}

async function worker(): Promise<void> {
  const options: RetryOptions = {
    retryLimit: 10,
    delayer: exponentialDelay(10),
  };
  for (let i = 0; i < 100; i++) {
    const lock = await LockFile.lock(file, options);
    const json = await readJson(file);
    json.count = json.count + 1;
    await lock.writeFile(JSON.stringify(json));
    await pause(3);
    await lock.commit();
    await pause(10);
  }
}

async function readJson(file: File): Promise<{ count: number }> {
  try {
    return (await file.readJson()) as { count: number };
  } catch (ex) {
    if (ex.code === "ENOENT") {
      return { count: 0 };
    } else {
      throw ex;
    }
  }
}
