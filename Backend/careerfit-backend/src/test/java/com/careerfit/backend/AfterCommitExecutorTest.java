package com.careerfit.backend;

import com.careerfit.backend.common.util.AfterCommitExecutor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.concurrent.Executor;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class AfterCommitExecutorTest {

    @AfterEach
    void cleanTransactionState() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        TransactionSynchronizationManager.setActualTransactionActive(false);
    }

    @Test
    void defersBackgroundTaskUntilTransactionCommits() {
        Executor executor = mock(Executor.class);
        Runnable task = mock(Runnable.class);
        AfterCommitExecutor afterCommitExecutor = new AfterCommitExecutor(executor);
        TransactionSynchronizationManager.setActualTransactionActive(true);
        TransactionSynchronizationManager.initSynchronization();

        afterCommitExecutor.execute(task);

        verifyNoInteractions(executor);
        TransactionSynchronizationManager.getSynchronizations().getFirst().afterCommit();
        verify(executor).execute(task);
    }

    @Test
    void executesImmediatelyWhenThereIsNoTransaction() {
        Executor executor = mock(Executor.class);
        Runnable task = mock(Runnable.class);

        new AfterCommitExecutor(executor).execute(task);

        verify(executor).execute(task);
    }
}
