package com.careerfit.backend.common.util;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Objects;
import java.util.concurrent.Executor;

/** Runs background work only after the surrounding transaction commits. */
@Component
public class AfterCommitExecutor {

    private final Executor taskExecutor;

    public AfterCommitExecutor(@Qualifier("taskExecutor") Executor taskExecutor) {
        this.taskExecutor = taskExecutor;
    }

    public void execute(Runnable task) {
        Objects.requireNonNull(task, "task");
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    taskExecutor.execute(task);
                }
            });
            return;
        }
        taskExecutor.execute(task);
    }
}
