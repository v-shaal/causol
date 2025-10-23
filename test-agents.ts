/**
 * Quick test script to verify all 5 agents work with OpenAI
 */

import * as dotenv from 'dotenv';
import { FormulationAgent } from './src/agents/formulation-agent';
import { EDAAgent } from './src/agents/eda-agent';
import { DAGAgent } from './src/agents/dag-agent';
import { IdentificationAgent } from './src/agents/identification-agent';
import { EstimationAgent } from './src/agents/estimation-agent';
import { WorkflowStage, SharedContext } from './src/types/workflow.types';
import { Task } from './src/types/agent.types';

// Load environment variables
dotenv.config();

async function testFormulationAgent() {
  console.log('\n=== Testing Formulation Agent ===');
  const agent = new FormulationAgent();

  const task: Task = {
    id: 'test-formulation',
    stage: WorkflowStage.FORMULATION,
    description: 'Formulate research question',
    input: 'Does taking aspirin reduce the risk of heart attack in adults over 50?',
  };

  const context: SharedContext = {
    confounders: [],
  };

  try {
    const result = await agent.execute(task, context);
    console.log('✓ Formulation Agent Success');
    console.log('Treatment:', context.treatment);
    console.log('Outcome:', context.outcome);
    console.log('Population:', context.population);
    console.log('\n📝 Full Result:', JSON.stringify(result.data, null, 2));
    return { success: true, context };
  } catch (error) {
    console.error('✗ Formulation Agent Failed:', error);
    return { success: false, error };
  }
}

async function testEDAAgent(context: SharedContext) {
  console.log('\n=== Testing EDA Agent ===');
  const agent = new EDAAgent();

  // Add mock dataset info
  context.dataset = {
    name: 'aspirin_study',
    rows: 1000,
    columns: ['age', 'aspirin_use', 'heart_attack', 'smoking', 'exercise'],
  };

  const task: Task = {
    id: 'test-eda',
    stage: WorkflowStage.EDA,
    description: 'Check EDA assumptions',
    input: 'Check assumptions',
  };

  try {
    const result = await agent.execute(task, context);
    console.log('✓ EDA Agent Success');
    console.log('Number of checks:', (result.data as any)?.checks?.length || 0);
    console.log('\n📝 Full Result:', JSON.stringify(result.data, null, 2));
    return { success: true, context };
  } catch (error) {
    console.error('✗ EDA Agent Failed:', error);
    return { success: false, error };
  }
}

async function testDAGAgent(context: SharedContext) {
  console.log('\n=== Testing DAG Agent ===');
  const agent = new DAGAgent();

  const task: Task = {
    id: 'test-dag',
    stage: WorkflowStage.DAG,
    description: 'Build DAG',
    input: 'Build DAG',
  };

  try {
    const result = await agent.execute(task, context);
    console.log('✓ DAG Agent Success');
    console.log('DAG nodes:', context.dag?.nodes?.length || 0);
    console.log('DAG edges:', context.dag?.edges?.length || 0);
    console.log('\n📝 Full Result:', JSON.stringify(result.data, null, 2));
    return { success: true, context };
  } catch (error) {
    console.error('✗ DAG Agent Failed:', error);
    return { success: false, error };
  }
}

async function testIdentificationAgent(context: SharedContext) {
  console.log('\n=== Testing Identification Agent ===');
  const agent = new IdentificationAgent();

  const task: Task = {
    id: 'test-identification',
    stage: WorkflowStage.IDENTIFICATION,
    description: 'Check identifiability',
    input: 'Check identifiability',
  };

  try {
    const result = await agent.execute(task, context);
    console.log('✓ Identification Agent Success');
    console.log('Identifiable:', (result.data as any)?.isIdentifiable);
    console.log('Adjustment set:', context.adjustmentSet);
    console.log('\n📝 Full Result:', JSON.stringify(result.data, null, 2));
    return { success: true, context };
  } catch (error) {
    console.error('✗ Identification Agent Failed:', error);
    return { success: false, error };
  }
}

async function testEstimationAgent(context: SharedContext) {
  console.log('\n=== Testing Estimation Agent ===');
  const agent = new EstimationAgent();

  const task: Task = {
    id: 'test-estimation',
    stage: WorkflowStage.ESTIMATION,
    description: 'Generate estimation code',
    input: 'Generate estimation code',
  };

  try {
    const result = await agent.execute(task, context);
    console.log('✓ Estimation Agent Success');
    console.log('Method:', (result.data as any)?.method);
    console.log('Python code length:', (result.data as any)?.pythonCode?.length || 0);
    console.log('\n📝 Python Code:');
    console.log((result.data as any)?.pythonCode);
    console.log('\n📝 Full Result:', JSON.stringify(result.data, null, 2));
    return { success: true, context };
  } catch (error) {
    console.error('✗ Estimation Agent Failed:', error);
    return { success: false, error };
  }
}

async function runAllTests() {
  console.log('🚀 Starting Agent Tests with OpenAI GPT-4o\n');
  console.log('API Key configured:', !!process.env.OPENAI_API_KEY);

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  const results = {
    formulation: false,
    eda: false,
    dag: false,
    identification: false,
    estimation: false,
  };

  // Test 1: Formulation
  const formResult = await testFormulationAgent();
  results.formulation = formResult.success;

  if (!formResult.success) {
    console.log('\n❌ Stopping tests - Formulation agent failed');
    return results;
  }

  // Test 2: EDA
  const edaResult = await testEDAAgent(formResult.context!);
  results.eda = edaResult.success;

  if (!edaResult.success) {
    console.log('\n⚠️  EDA agent failed, continuing with other tests...');
  }

  // Test 3: DAG
  const dagResult = await testDAGAgent(formResult.context!);
  results.dag = dagResult.success;

  if (!dagResult.success) {
    console.log('\n❌ Stopping tests - DAG agent failed');
    return results;
  }

  // Test 4: Identification
  const identResult = await testIdentificationAgent(dagResult.context!);
  results.identification = identResult.success;

  if (!identResult.success) {
    console.log('\n❌ Stopping tests - Identification agent failed');
    return results;
  }

  // Test 5: Estimation
  const estResult = await testEstimationAgent(identResult.context!);
  results.estimation = estResult.success;

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(50));
  console.log('Formulation Agent:', results.formulation ? '✅ PASS' : '❌ FAIL');
  console.log('EDA Agent:', results.eda ? '✅ PASS' : '❌ FAIL');
  console.log('DAG Agent:', results.dag ? '✅ PASS' : '❌ FAIL');
  console.log('Identification Agent:', results.identification ? '✅ PASS' : '❌ FAIL');
  console.log('Estimation Agent:', results.estimation ? '✅ PASS' : '❌ FAIL');
  console.log('='.repeat(50));

  const passCount = Object.values(results).filter(r => r).length;
  console.log(`\n${passCount}/5 agents working correctly`);

  if (passCount === 5) {
    console.log('\n🎉 All agents tested successfully!');
  } else {
    console.log('\n⚠️  Some agents need attention');
  }

  return results;
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Test runner crashed:', error);
    process.exit(1);
  });
