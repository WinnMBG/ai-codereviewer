import { readFileSync } from 'fs';
import * as core from '@actions/core';
import { Octokit } from '@octokit/rest';
import OpenAI from 'openai';
import { File } from 'parse-diff';
import { getPRDetails, getDiff, analyzeCode, createReviewComment, main } from '../main';

// Mocking dependencies
jest.mock('fs');
jest.mock('@actions/core');
jest.mock('@octokit/rest');
jest.mock('openai');
jest.mock('parse-diff');
jest.mock('minimatch');

const GITHUB_TOKEN = 'fake-github-token';
const OPENAI_API_KEY = 'fake-openai-key';
const OPENAI_API_MODEL = 'fake-model';

const mockedCore = core as jest.Mocked<typeof core>;
const mockedOctokit = new Octokit() as jest.Mocked<Octokit>;
const mockedOpenAI = OpenAI as jest.Mocked<typeof OpenAI>;

mockedCore.getInput.mockImplementation((input: string) => {
  switch (input) {
    case 'GITHUB_TOKEN':
      return GITHUB_TOKEN;
    case 'OPENAI_API_KEY':
      return OPENAI_API_KEY;
    case 'OPENAI_API_MODEL':
      return OPENAI_API_MODEL;
    default:
      return '';
  }
});

describe('main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPRDetails', () => {
    it('should return PR details', async () => {
      const eventPath = '/path/to/github/event.json';
      const eventData = {
        repository: {
          owner: { login: 'owner' },
          name: 'repo',
        },
        number: 1,
      };
      const prData = {
        data: {
          title: 'PR Title',
          body: 'PR Description',
        },
      };

      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(eventData));
      mockedOctokit.pulls.get.mockResolvedValue(prData);

      const prDetails = await getPRDetails();

      expect(prDetails).toEqual({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        title: 'PR Title',
        description: 'PR Description',
      });
    });
  });

  describe('getDiff', () => {
    it('should return diff string', async () => {
      const diff = 'diff --git a/file.txt b/file.txt';
      mockedOctokit.pulls.get.mockResolvedValue({ data: diff });

      const result = await getDiff('owner', 'repo', 1);

      expect(result).toBe(diff);
    });
  });

  describe('analyzeCode', () => {
    it('should return comments for code analysis', async () => {
      const parsedDiff: File[] = [{
          to: 'file.txt',
          chunks: [{
              changes: [],
              content: 'chunk content',
              newLines: 5,
              oldLines: 5,
              newStart: 1,
              oldStart: 1,
          }],
          deletions: 0,
          additions: 0
      }];

      const prDetails = {
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        title: 'PR Title',
        description: 'PR Description',
      };

      const aiResponse = {
        reviewComment: 'AI Comment',
        lineNumber: 1,
      };

      mockedOpenAI.getAIResponse.mockResolvedValue(aiResponse);

      const comments = await analyzeCode(parsedDiff, prDetails);

      expect(comments).toEqual([{
        body: 'AI Comment',
        path: 'file.txt',
        line: 1,
      }]);
    });
  });

  describe('createReviewComment', () => {
    it('should create review comment on GitHub', async () => {
      const comments = [{
        body: 'Review Comment',
        path: 'file.txt',
        line: 1,
      }];

      await createReviewComment('owner', 'repo', 1, comments);

      expect(mockedOctokit.pulls.createReview).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        comments,
        event: 'COMMENT',
      });
    });
  });

  describe('main', () => {
    it('should run the main function successfully', async () => {
      const prDetails = {
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        title: 'PR Title',
        description: 'PR Description',
      };

      const diff = 'diff --git a/file.txt b/file.txt';

      jest.spyOn(global.console, 'log').mockImplementation(() => {});
      jest.spyOn(global.console, 'error').mockImplementation(() => {});

      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
        action: 'opened',
        repository: {
          owner: { login: 'owner' },
          name: 'repo',
        },
        number: 1,
      }));

      mockedOctokit.pulls.get.mockResolvedValueOnce({ data: diff });
      mockedOctokit.pulls.get.mockResolvedValueOnce({ data: { title: 'PR Title', body: 'PR Description' } });

      await main();

      expect(mockedOctokit.pulls.createReview).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No diff found'));
    });
  });
});
